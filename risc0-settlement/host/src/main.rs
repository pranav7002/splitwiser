use methods::{SETTLEMENT_ELF, SETTLEMENT_ID};
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde::{Deserialize, Serialize};
use std::io::{self, Read};

// ── Input types (mirroring the guest) ───────────────────────────────────

#[derive(Deserialize)]
struct HostInput {
    participants: Vec<ParticipantInput>,
}

#[derive(Deserialize, Serialize, Clone)]
struct ParticipantInput {
    #[serde(alias = "walletAddress")]
    wallet_address: String,
    balance: i64,
}

// ── Output types (mirroring the guest journal) ──────────────────────────

#[derive(Deserialize, Serialize)]
struct SettlementOutput {
    settlements: Vec<Transfer>,
}

#[derive(Deserialize, Serialize)]
struct Transfer {
    from: String,
    to: String,
    amount: u64,
}

// ── Final JSON written to stdout for the Node backend ───────────────────

#[derive(Serialize)]
struct HostOutput {
    settlements: Vec<Transfer>,
    proof: String,
    #[serde(rename = "imageId")]
    image_id: String,
}

fn main() {
    // Quiet tracing unless RUST_LOG is set
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::filter::EnvFilter::from_default_env())
        .init();

    // ── 1. Read JSON input from stdin ───────────────────────────────────
    let mut input_json = String::new();
    io::stdin()
        .read_to_string(&mut input_json)
        .expect("Failed to read stdin");

    let host_input: HostInput =
        serde_json::from_str(&input_json).expect("Failed to parse input JSON");

    // ── 2. Build the guest input struct (matching guest's SettlementInput) ──
    // We re-serialize the participants so the guest receives a clean struct.
    #[derive(Serialize)]
    struct GuestInput {
        participants: Vec<GuestParticipant>,
    }
    #[derive(Serialize)]
    struct GuestParticipant {
        wallet_address: String,
        balance: i64,
    }

    let guest_input = GuestInput {
        participants: host_input
            .participants
            .iter()
            .map(|p| GuestParticipant {
                wallet_address: p.wallet_address.clone(),
                balance: p.balance,
            })
            .collect(),
    };

    // ── 3. Create executor environment and pass input ───────────────────
    let env = ExecutorEnv::builder()
        .write(&guest_input)
        .expect("Failed to write input to executor env")
        .build()
        .expect("Failed to build executor env");

    // ── 4. Prove ────────────────────────────────────────────────────────
    let prover = default_prover();
    let prove_info = prover
        .prove(env, SETTLEMENT_ELF)
        .expect("Proving failed");

    let receipt = prove_info.receipt;

    // ── 5. Verify (sanity check) ────────────────────────────────────────
    receipt
        .verify(SETTLEMENT_ID)
        .expect("Receipt verification failed");

    // ── 6. Decode the journal (guest's committed output) ────────────────
    let output: SettlementOutput = receipt.journal.decode().expect("Failed to decode journal");

    // ── 7. Serialize the receipt bytes as a hex proof string ─────────────
    let receipt_bytes = bincode::serialize(&receipt).expect("Failed to serialize receipt");
    let proof_hex = format!("0x{}", hex::encode(&receipt_bytes));

    // Image ID as hex
    let image_id_hex = format!(
        "0x{}",
        SETTLEMENT_ID
            .iter()
            .flat_map(|w| w.to_le_bytes())
            .map(|b| format!("{:02x}", b))
            .collect::<String>()
    );

    // ── 8. Print JSON to stdout ─────────────────────────────────────────
    let host_output = HostOutput {
        settlements: output.settlements,
        proof: proof_hex,
        image_id: image_id_hex,
    };

    println!("{}", serde_json::to_string(&host_output).unwrap());
}
