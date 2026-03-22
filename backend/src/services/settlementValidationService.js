const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const normalizeAddress = (value) => String(value).trim().toLowerCase();

const isValidAddress = (value) =>
  typeof value === "string" && ETH_ADDRESS_REGEX.test(value.trim());

const isInteger = (value) => Number.isInteger(value);

export const validateParticipants = (participants) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("participants must be a non-empty array");
  }

  const seen = new Set();

  const normalized = participants.map((participant, index) => {
    if (!participant || typeof participant !== "object") {
      throw new Error(`Invalid participant at index ${index}`);
    }

    const { walletAddress, balance } = participant;

    if (!isValidAddress(walletAddress)) {
      throw new Error(`Invalid walletAddress at index ${index}`);
    }

    if (!isInteger(balance)) {
      throw new Error(`Balance must be an integer at index ${index}`);
    }

    const addr = normalizeAddress(walletAddress);

    if (seen.has(addr)) {
      throw new Error(`Duplicate walletAddress found: ${walletAddress}`);
    }

    seen.add(addr);

    return {
      ...participant,
      walletAddress: addr,
      balance,
    };
  });

  const totalBalance = normalized.reduce((sum, p) => sum + p.balance, 0);

  if (totalBalance !== 0) {
    throw new Error("Participant balances must sum to zero");
  }

  return normalized;
};

export const validateSettlementOutput = (participants, settlements) => {
  const normalizedParticipants = validateParticipants(participants);

  if (!Array.isArray(settlements)) {
    throw new Error("settlements must be an array");
  }

  const balanceMap = new Map(
    normalizedParticipants.map((p) => [p.walletAddress, p.balance])
  );

  const normalizedSettlements = [];

  for (let i = 0; i < settlements.length; i++) {
    const settlement = settlements[i];

    if (!settlement || typeof settlement !== "object") {
      throw new Error(`Invalid settlement at index ${i}`);
    }

    const { from, to, amount } = settlement;

    if (!isValidAddress(from)) {
      throw new Error(`Invalid settlement.from at index ${i}`);
    }

    if (!isValidAddress(to)) {
      throw new Error(`Invalid settlement.to at index ${i}`);
    }

    if (normalizeAddress(from) === normalizeAddress(to)) {
      throw new Error(`Settlement from/to cannot be the same at index ${i}`);
    }

    if (!isInteger(amount) || amount <= 0) {
      throw new Error(`Invalid settlement amount at index ${i}`);
    }

    const fromAddr = normalizeAddress(from);
    const toAddr = normalizeAddress(to);

    if (!balanceMap.has(fromAddr)) {
      throw new Error(`Settlement.from is not a known participant: ${from}`);
    }

    if (!balanceMap.has(toAddr)) {
      throw new Error(`Settlement.to is not a known participant: ${to}`);
    }

    const fromBalanceBefore = balanceMap.get(fromAddr);
    const toBalanceBefore = balanceMap.get(toAddr);

    if (fromBalanceBefore >= 0) {
      throw new Error(
        `Settlement.from must start with a negative balance: ${from}`
      );
    }

    if (toBalanceBefore <= 0) {
      throw new Error(`Settlement.to must start with a positive balance: ${to}`);
    }

    const fromBalanceAfter = fromBalanceBefore + amount;
    const toBalanceAfter = toBalanceBefore - amount;

    if (fromBalanceAfter > 0) {
      throw new Error(`Settlement overpays debtor: ${from}`);
    }

    if (toBalanceAfter < 0) {
      throw new Error(`Settlement overpays creditor: ${to}`);
    }

    balanceMap.set(fromAddr, fromBalanceAfter);
    balanceMap.set(toAddr, toBalanceAfter);

    normalizedSettlements.push({
      from: fromAddr,
      to: toAddr,
      amount,
    });
  }

  for (const [address, balance] of balanceMap.entries()) {
    if (balance !== 0) {
      throw new Error(
        `Settlement does not fully clear balances; residual balance at ${address}: ${balance}`
      );
    }
  }

  return normalizedSettlements;
};

export const settlementsAreEqual = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];

    if (
      normalizeAddress(x.from) !== normalizeAddress(y.from) ||
      normalizeAddress(x.to) !== normalizeAddress(y.to) ||
      x.amount !== y.amount
    ) {
      return false;
    }
  }

  return true;
};