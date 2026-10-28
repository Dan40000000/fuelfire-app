import { AsyncLocalStorage } from 'node:async_hooks';

const DEFAULT_PROVIDER_BUDGET = 8;
const MAX_PROVIDER_BUDGET = 32;
const providerBudgetStorage = new AsyncLocalStorage();

function boundedInteger(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function getProviderBudgetLimit(value) {
    return boundedInteger(value ?? process.env.FUELFIRE_PROVIDER_BUDGET, DEFAULT_PROVIDER_BUDGET, 1, MAX_PROVIDER_BUDGET);
}

export function createProviderBudget({ limit } = {}) {
    const maxAttempts = getProviderBudgetLimit(limit);
    let attempts = 0;

    return {
        get limit() {
            return maxAttempts;
        },
        get attempts() {
            return attempts;
        },
        remaining() {
            return Math.max(0, maxAttempts - attempts);
        },
        consume(provider = 'unknown') {
            if (attempts >= maxAttempts) {
                const error = new Error('Provider request budget exhausted.');
                error.code = 'PROVIDER_BUDGET_EXHAUSTED';
                error.provider = provider;
                error.retryable = false;
                throw error;
            }
            attempts += 1;
            return { attempt: attempts, remaining: maxAttempts - attempts };
        },
    };
}

export function getProviderBudget() {
    return providerBudgetStorage.getStore() || null;
}

export function runWithProviderBudget(callback, { limit } = {}) {
    if (typeof callback !== 'function') {
        throw new TypeError('Provider budget callback is required.');
    }
    return providerBudgetStorage.run(createProviderBudget({ limit }), callback);
}

export const providerBudgetConstants = {
    DEFAULT_PROVIDER_BUDGET,
    MAX_PROVIDER_BUDGET,
};
