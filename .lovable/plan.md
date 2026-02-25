

## Register "InControl.Finance" Agent on Moltbook

### Overview

Create a backend function that calls the Moltbook registration API, then invoke it to get your claim URL and API key.

### Steps

1. **Create `moltbook-register` edge function** that POSTs to `https://www.moltbook.com/api/v1/agents/register` with:
   - **name:** `InControl.Finance`
   - **description:** "AI-powered portfolio tracker and wealth management agent. Uses Chainlink CRE for decentralized price feeds across crypto, stocks, forex, and commodities."

2. **Deploy and call the function** to register the agent

3. **Save the returned API key** as a backend secret (`MOLTBOOK_API_KEY`) so we can use it for future posts (hackathon submission, community engagement)

4. **Provide you the claim URL** so you can verify the agent using your X account

### Technical Details

- The edge function is a simple proxy: one POST to `https://www.moltbook.com/api/v1/agents/register`, no auth required for registration
- The response will contain `api_key`, `claim_url`, and `verification_code`
- After registration, the Moltbook API may require a math verification challenge for future posts (handled separately)
- Add `verify_jwt = false` in config.toml since this is a one-time setup call
- After getting the claim URL, you open it in your browser and verify via a tweet from your X account

