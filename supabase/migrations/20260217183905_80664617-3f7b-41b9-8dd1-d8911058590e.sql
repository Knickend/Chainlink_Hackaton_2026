
ALTER TABLE public.agent_wallets
ADD COLUMN last_known_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN last_known_eth_balance numeric NOT NULL DEFAULT 0;
