use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};

/// Input passed from the host into the zkVM guest.
#[derive(Deserialize)]
struct SettlementInput {
    participants: Vec<Participant>,
}

#[derive(Deserialize, Clone)]
struct Participant {
    wallet_address: String,
    balance: i64,
}

/// A single debtor→creditor transfer produced by the algorithm.
#[derive(Serialize, Clone)]
struct Transfer {
    from: String,
    to: String,
    amount: u64,
}

/// The committed output: the settlement result that becomes the journal (public).
#[derive(Serialize)]
struct SettlementOutput {
    settlements: Vec<Transfer>,
}

/// Deterministic greedy min-cash-flow settlement.
/// This is the EXACT same algorithm as the JS version in groupSettlementService.js.
fn compute_settlements(participants: &[Participant]) -> Vec<Transfer> {
    let mut creditors: Vec<(String, i64)> = Vec::new();
    let mut debtors: Vec<(String, i64)> = Vec::new();

    for p in participants {
        if p.balance > 0 {
            creditors.push((p.wallet_address.clone(), p.balance));
        } else if p.balance < 0 {
            debtors.push((p.wallet_address.clone(), p.balance));
        }
    }

    // Sort creditors: largest credit first, tie-break by address (ascending)
    creditors.sort_by(|a, b| {
        b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0))
    });

    // Sort debtors: largest debt first (most negative), tie-break by address (ascending)
    debtors.sort_by(|a, b| {
        a.1.cmp(&b.1).then_with(|| a.0.cmp(&b.0))
    });

    let mut transfers = Vec::new();
    let mut i = 0usize;
    let mut j = 0usize;

    while i < debtors.len() && j < creditors.len() {
        let debt_amount = debtors[i].1.unsigned_abs();
        let credit_amount = creditors[j].1 as u64;
        let transfer_amount = debt_amount.min(credit_amount);

        if transfer_amount > 0 {
            transfers.push(Transfer {
                from: debtors[i].0.clone(),
                to: creditors[j].0.clone(),
                amount: transfer_amount,
            });
        }

        debtors[i].1 += transfer_amount as i64;
        creditors[j].1 -= transfer_amount as i64;

        if debtors[i].1 == 0 {
            i += 1;
        }
        if creditors[j].1 == 0 {
            j += 1;
        }
    }

    transfers
}

fn main() {
    // Read structured input from the host
    let input: SettlementInput = env::read();

    // Run the deterministic settlement algorithm
    let settlements = compute_settlements(&input.participants);

    // Commit the output to the journal (this becomes the public output)
    let output = SettlementOutput { settlements };
    env::commit(&output);
}
