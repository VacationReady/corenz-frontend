# AI Assistant Environment Variables

## Required Variables

### `OPENAI_API_KEY`

**Required:** Yes  
**Format:** `sk-...`  
**Purpose:** OpenAI API authentication

```bash
OPENAI_API_KEY="sk-proj-abc123..."
```

**Where to get it:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy and save immediately (cannot be viewed again)

---

## Optional Variables

### `OPENAI_FINE_TUNED_MODEL`

**Required:** No  
**Default:** None (uses base model)  
**Format:** `ft:base-model:org:suffix:id`  
**Purpose:** Use a fine-tuned model for improved casual language understanding

```bash
OPENAI_FINE_TUNED_MODEL="ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:8xYz123"
```

**When to use:**
- After completing fine-tuning process (see `AI_FINETUNING_DEPLOYMENT_GUIDE.md`)
- To enable understanding of slang, typos, and casual language
- For cost savings (~70% cheaper than base model)

**How to set:**

**Development (.env.local):**
```bash
OPENAI_FINE_TUNED_MODEL="ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:8xYz123"
```

**Vercel (Production):**
```bash
# Via CLI
vercel env add OPENAI_FINE_TUNED_MODEL

# Or in Vercel Dashboard:
# Project Settings → Environment Variables → Add Variable
# Name: OPENAI_FINE_TUNED_MODEL
# Value: ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:8xYz123
```

**How to revert to base model:**
```bash
# Remove the variable
vercel env rm OPENAI_FINE_TUNED_MODEL

# Or set to empty string
OPENAI_FINE_TUNED_MODEL=""
```

---

### `OPENAI_MODEL`

**Required:** No  
**Default:** `gpt-4-turbo-preview`  
**Purpose:** Specify base model (when not using fine-tuned model)

```bash
OPENAI_MODEL="gpt-4-turbo-preview"
```

**Available Options:**
- `gpt-4-turbo-preview` (default, most capable)
- `gpt-4-turbo-2024-04-09` (specific version)
- `gpt-4o-mini-2024-07-18` (cheaper, faster)
- `gpt-3.5-turbo` (cheapest, less capable)

**Precedence:**
1. `OPENAI_FINE_TUNED_MODEL` (if set)
2. `OPENAI_MODEL` (if set)
3. Default: `gpt-4-turbo-preview`

---

### `OPENAI_TEMPERATURE`

**Required:** No  
**Default:** `0.7`  
**Range:** `0.0` to `2.0`  
**Purpose:** Control response randomness

```bash
OPENAI_TEMPERATURE="0.7"
```

**Guidelines:**
- `0.0-0.3`: Deterministic, precise (good for data queries)
- `0.4-0.7`: Balanced (recommended for general use)
- `0.8-1.0`: Creative, varied (good for brainstorming)
- `1.1-2.0`: Very creative (rarely needed)

---

### `DISABLE_AI_RATE_LIMIT`

**Required:** No  
**Default:** `false`  
**Purpose:** Disable rate limiting (development only)

```bash
DISABLE_AI_RATE_LIMIT="true"
```

**⚠️ Warning:** Only use in development. Production should always have rate limiting enabled.

**Default Rate Limits:**
- 500 requests per hour per user
- Configurable in `app/lib/ai/openai-client.ts`

---

### `AI_DEBUG_MODE`

**Required:** No  
**Default:** `false`  
**Purpose:** Enable verbose logging for AI interactions

```bash
AI_DEBUG_MODE="true"
```

**What it logs:**
- Full prompts sent to OpenAI
- Complete responses
- Token counts
- Latency measurements
- Intent classification details

**Use Cases:**
- Debugging model behavior
- Understanding why queries fail
- Performance analysis
- Fine-tuning dataset creation

---

### `LOG_AI_INTERACTIONS`

**Required:** No  
**Default:** `false`  
**Purpose:** Save all AI interactions to file/database

```bash
LOG_AI_INTERACTIONS="true"
```

**Storage:** Logs saved to `logs/ai-interactions.json`

**Privacy:** Ensure PII handling compliance when enabling

---

## Environment-Specific Recommendations

### Development

```bash
# .env.local
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4-turbo-preview"
DISABLE_AI_RATE_LIMIT="true"
AI_DEBUG_MODE="true"
```

### Staging

```bash
# Vercel staging environment
OPENAI_API_KEY="sk-..."
OPENAI_FINE_TUNED_MODEL="ft:gpt-4o-mini-2024-07-18:..." # Testing new model
AI_DEBUG_MODE="true"
LOG_AI_INTERACTIONS="true"
```

### Production

```bash
# Vercel production environment
OPENAI_API_KEY="sk-..."
OPENAI_FINE_TUNED_MODEL="ft:gpt-4o-mini-2024-07-18:..." # After successful staging
DISABLE_AI_RATE_LIMIT="false"
AI_DEBUG_MODE="false"
LOG_AI_INTERACTIONS="false" # Or "true" with proper PII handling
```

---

## Checking Current Configuration

Add a helper endpoint to check configuration (development only):

```typescript
// app/api/ai/config/route.ts
import { AI_CONFIG, AI_MODEL_INFO } from '@/lib/ai/openai-client';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  return Response.json({
    model: AI_CONFIG.model,
    isFineTuned: AI_MODEL_INFO.isFineTuned,
    baseModel: AI_MODEL_INFO.baseModel,
    temperature: AI_CONFIG.temperature,
    rateLimitDisabled: !!process.env.DISABLE_AI_RATE_LIMIT,
    debugMode: !!process.env.AI_DEBUG_MODE,
  });
}
```

**Usage:**
```bash
curl http://localhost:3000/api/ai/config | jq
```

---

## Security Best Practices

### API Key Management

1. **Never commit API keys to git**
   - Use `.env.local` for development
   - Use environment management tools for production

2. **Rotate keys regularly**
   - OpenAI allows key rotation
   - Update in all environments simultaneously

3. **Use different keys per environment**
   - Development key (low rate limit)
   - Staging key (medium rate limit)
   - Production key (high rate limit)

4. **Monitor usage**
   - Set up billing alerts in OpenAI dashboard
   - Track usage by environment

### Fine-Tuned Model Security

1. **Access Control**
   - Fine-tuned models are private to your organization
   - Only team members with OpenAI access can view/use

2. **Model ID Protection**
   - Treat model IDs as sensitive
   - Don't expose in client-side code
   - Don't log in public logs

3. **Version Control**
   - Track model IDs in secure registry
   - Document which models are deployed where

---

## Troubleshooting

### "Invalid API Key"

```bash
# Check if key is set
echo $OPENAI_API_KEY

# Verify format (should start with "sk-")
# Regenerate key in OpenAI dashboard if invalid
```

### "Model not found"

```bash
# Check model ID format
echo $OPENAI_FINE_TUNED_MODEL

# Verify model exists
openai api models.retrieve -i "$OPENAI_FINE_TUNED_MODEL"

# If model deleted, remove env var to use base model
```

### "Rate limit exceeded"

```bash
# Check if rate limiting disabled (should be false in prod)
echo $DISABLE_AI_RATE_LIMIT

# Check OpenAI dashboard for quota limits
# Upgrade plan or wait for reset
```

### "Model not using fine-tuned version"

```bash
# Verify environment variable is set
vercel env ls

# Check precedence: OPENAI_FINE_TUNED_MODEL > OPENAI_MODEL > default

# Restart application after changing env vars
```

---

## Cost Monitoring

Track costs by environment:

```bash
# Development (estimate)
OPENAI_MODEL="gpt-4o-mini-2024-07-18"
# ~$0.006 per query (500 tokens average)

# Production (with fine-tuned model)
OPENAI_FINE_TUNED_MODEL="ft:gpt-4o-mini-2024-07-18:..."
# ~$0.006 per query (70% cheaper than gpt-4-turbo)

# Production (base model)
OPENAI_MODEL="gpt-4-turbo-preview"
# ~$0.02 per query
```

**Monthly estimates:**
- 10K queries/month with fine-tuned model: ~$60
- 10K queries/month with base model: ~$200

---

## References

- **OpenAI Platform:** https://platform.openai.com
- **API Documentation:** https://platform.openai.com/docs
- **Fine-Tuning Guide:** https://platform.openai.com/docs/guides/fine-tuning
- **Model Registry:** `docs/AI_MODEL_REGISTRY.md`
- **Deployment Guide:** `docs/AI_FINETUNING_DEPLOYMENT_GUIDE.md`

---

**Last Updated:** October 3, 2025

