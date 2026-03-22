use axum::{extract::Json, http::StatusCode, routing::{get, post}, Router};
use methods::{SETTLEMENT_ELF, SETTLEMENT_ID};
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

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

// ── Final JSON response ─────────────────────────────────────────────────

#[derive(Serialize)]
struct HostOutput {
    settlements: Vec<Transfer>,
    proof: String,
    #[serde(rename = "imageId")]
    image_id: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// ── Prove handler ───────────────────────────────────────────────────────

async fn prove(Json(host_input): Json<HostInput>) -> Result<Json<HostOutput>, (StatusCode, Json<ErrorResponse>)> {
    // Build the guest input
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

    // Create executor environment and pass input
    let env = ExecutorEnv::builder()
        .write(&guest_input)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Failed to write input: {e}") })))?
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Failed to build env: {e}") })))?;

    // Prove
    let prover = default_prover();
    let prove_info = prover
        .prove(env, SETTLEMENT_ELF)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Proving failed: {e}") })))?;

    let receipt = prove_info.receipt;

    // Verify (sanity check)
    receipt
        .verify(SETTLEMENT_ID)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Verification failed: {e}") })))?;

    // Decode journal
    let output: SettlementOutput = receipt.journal.decode()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Journal decode failed: {e}") })))?;

    // Serialize receipt as hex proof
    let receipt_bytes = bincode::serialize(&receipt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: format!("Serialize failed: {e}") })))?;
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

    Ok(Json(HostOutput {
        settlements: output.settlements,
        proof: proof_hex,
        image_id: image_id_hex,
    }))
}

// ── Health check ────────────────────────────────────────────────────────

async fn health() -> &'static str {
    "ok"
}

// ── Main ────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::filter::EnvFilter::from_default_env())
        .init();

    let app = Router::new()
        .route("/prove", post(prove))
        .route("/health", get(health))
        .layer(CorsLayer::permissive());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3002);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("zkVM proving service running on http://0.0.0.0:{port}");
    println!("POST http://0.0.0.0:{port}/prove");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
