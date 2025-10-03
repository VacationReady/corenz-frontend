# AI Model Registry

This document tracks all AI models deployed in the Corenz HR Assistant system, including base models and fine-tuned variants.

## Current Production Model

| Environment | Model ID | Type | Deployed | Notes |
|------------|----------|------|----------|-------|
| Production | `gpt-4-turbo-preview` | Base | Always | Fallback model |
| Staging | `gpt-4-turbo-preview` | Base | Always | Testing environment |

## Fine-Tuned Models

### Assistant Flex v1

**Purpose:** Improved understanding of casual, slang-heavy, and partially incoherent language while preserving safety behaviors.

| Attribute | Value |
|-----------|-------|
| **Model ID** | `ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:XXXXXX` _(Placeholder - Update after training)_ |
| **Base Model** | `gpt-4o-mini-2024-07-18` |
| **Training Dataset** | `data/fine-tuning/assistant-flex-v1.jsonl` |
| **Dataset Size** | 12 conversations, ~120 messages |
| **Training Date** | TBD _(Update when training completes)_ |
| **Training Job ID** | TBD _(Update from OpenAI)_ |
| **Hyperparameters** | `n_epochs=3, batch_size=4, learning_rate_multiplier=0.1` |
| **Validation Loss** | TBD _(Update after training)_ |
| **Status** | 🟡 Pending Training |
| **Deployed To** | None |

**Capabilities Enhanced:**
- Interprets slang ("yo", "bro", "fr fr", "u", "thx")
- Handles typos and abbreviations
- Understands emojis in context
- Surfaces assumptions clearly
- Asks clarifying questions naturally

**Safety Behaviors Preserved:**
- Audit reason requirements
- Preview before execution
- Explicit confirmation required
- Polite refusal of unsafe actions
- Data privacy boundaries

**Evaluation Results:**
- TBD after running `scripts/evaluate-finetune.ts`

**Rollback Plan:**
- Set `OPENAI_FINE_TUNED_MODEL=""` to revert to base model
- No code changes required
- Monitor error rates in first 48 hours

---

## Training History

### Fine-Tune Training Log

```bash
# Training command used:
openai api fine_tunes.create \
  -t data/fine-tuning/assistant-flex-v1.jsonl \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "corenz-assistant-flex-v1" \
  --n_epochs 3 \
  --batch_size 4 \
  --learning_rate_multiplier 0.1

# Job ID: TBD
# Status: Pending
# Started: TBD
# Completed: TBD
```

**Training Metrics:** _(Update after training completes)_
```
Epoch 1: train_loss=X.XX, train_accuracy=X.XX
Epoch 2: train_loss=X.XX, train_accuracy=X.XX
Epoch 3: train_loss=X.XX, train_accuracy=X.XX
Final validation_loss: X.XX
```

---

## Model Evaluation Criteria

Before deploying any fine-tuned model to production, it must pass:

### 1. Automated Tests (`scripts/evaluate-finetune.ts`)

- [ ] Slang interpretation accuracy ≥ 90%
- [ ] Clarification questions asked when needed
- [ ] Confirmation prompts present for sensitive actions
- [ ] Safety refusals triggered appropriately
- [ ] Audit requirements not bypassed

### 2. Manual Review Checklist

- [ ] 20+ test conversations in staging
- [ ] No hallucinations or incorrect tool calls
- [ ] Response tone appropriate (friendly but professional)
- [ ] No degradation in base model capabilities
- [ ] Latency acceptable (≤ 3s per response)

### 3. Business Validation

- [ ] HR team approves behavior changes
- [ ] Legal/compliance review passed
- [ ] No user complaints in first 48 hours staging
- [ ] Conversation success rate maintained or improved

---

## Deployment Process

### 1. Training Phase

```bash
# Step 1: Validate dataset format
cd data/fine-tuning
openai tools fine_tunes.prepare_data -f assistant-flex-v1.jsonl

# Step 2: Upload and train
openai api fine_tunes.create \
  -t assistant-flex-v1.jsonl \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "corenz-assistant-flex-v1" \
  --n_epochs 3

# Step 3: Monitor training
openai api fine_tunes.follow -i <FINE_TUNE_ID>

# Step 4: Get model ID when complete
openai api fine_tunes.get -i <FINE_TUNE_ID>
```

### 2. Evaluation Phase

```bash
# Step 1: Update model ID in evaluation script
# Edit scripts/evaluate-finetune.ts with new model ID

# Step 2: Run automated evaluation
npm run evaluate-finetune

# Step 3: Review results
# Check console output and logs/evaluation-report.json
```

### 3. Staging Deployment

```bash
# Step 1: Update staging environment variable
# In staging .env:
OPENAI_FINE_TUNED_MODEL=ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:XXXXXX

# Step 2: Deploy to staging
vercel --prod --env staging

# Step 3: Monitor for 48 hours
# Check error rates, user feedback, conversation success rates
```

### 4. Production Deployment

```bash
# Step 1: Verify staging success
# Confirm: 
# - No error rate increase
# - User satisfaction maintained
# - No compliance issues

# Step 2: Update production environment variable
# In production .env:
OPENAI_FINE_TUNED_MODEL=ft:gpt-4o-mini-2024-07-18:corenz:assistant-flex-v1:XXXXXX

# Step 3: Gradual rollout (if possible)
# Option A: Enable for internal users first
# Option B: A/B test 10% of traffic

# Step 4: Full deployment
vercel --prod

# Step 5: Monitor continuously
# First 1 hour: Check for critical errors
# First 24 hours: Monitor all metrics
# First week: Gather user feedback
```

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

If critical issues detected:

```bash
# Option 1: Revert environment variable
OPENAI_FINE_TUNED_MODEL=""  # Empty = use base model

# Option 2: Explicit base model
OPENAI_FINE_TUNED_MODEL="gpt-4-turbo-preview"

# Redeploy
vercel --prod

# No code changes needed!
```

### Partial Rollback (Gradual)

```bash
# Implement feature flag (future enhancement)
ENABLE_FINE_TUNED_MODEL_PERCENT=50  # 50% of users

# Or disable for specific user roles
FINE_TUNED_MODEL_DISABLED_ROLES="EMPLOYEE,MANAGER"
```

---

## Cost Analysis

### Base Model Costs (Current)

- **Model:** gpt-4-turbo-preview
- **Input:** $10.00 / 1M tokens
- **Output:** $30.00 / 1M tokens
- **Average conversation:** ~500 tokens
- **Monthly volume:** ~10,000 queries
- **Estimated monthly cost:** $200-300

### Fine-Tuned Model Costs (Projected)

- **Model:** gpt-4o-mini fine-tuned
- **Training cost:** ~$5-10 (one-time)
- **Input:** $3.00 / 1M tokens (hosting fee included)
- **Output:** $6.00 / 1M tokens (hosting fee included)
- **Average conversation:** ~500 tokens
- **Monthly volume:** ~10,000 queries
- **Estimated monthly cost:** $45-60

**Savings:** ~$140-240/month (~70% reduction)

**ROI:**
- Training cost recovered in first month
- Improved user experience (fewer failed requests)
- Reduced support burden (better understanding)

---

## Monitoring & Metrics

### Key Performance Indicators

Track in production dashboard:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time | < 3s | > 5s |
| Error Rate | < 2% | > 5% |
| Clarification Rate | 20-40% | < 10% or > 60% |
| Confirmation Rate (sensitive ops) | 100% | < 100% |
| Refusal Rate (unsafe ops) | 100% | < 100% |
| User Satisfaction | > 4.5/5 | < 4.0/5 |
| Conversation Success Rate | > 85% | < 75% |

### Logging

All AI interactions logged with:
- User ID and company ID
- Model used (base vs. fine-tuned)
- Input/output token counts
- Response time
- Success/failure status
- User feedback (if provided)

### Alerts

Set up alerts for:
- Model serving errors (immediate)
- Response time degradation (5-minute window)
- Unusual spike in refusals (hourly)
- Conversation abandonment rate increase (daily)

---

## Future Model Versions

### Planned Enhancements

**Assistant Flex v2** (Q1 2026)
- Multilingual slang support (Spanish, Mandarin)
- Sentiment awareness (detect frustration, urgency)
- Larger dataset (50+ conversations)
- Function calling integration

**Assistant Domain Experts** (Q2 2026)
- Specialized models per domain:
  - Leave management expert
  - Onboarding expert
  - Compliance expert
- Mixture-of-experts architecture

**Assistant Personalization** (Q3 2026)
- Learn user preferences
- Adapt tone to user style
- Remember past interactions

---

## Compliance & Security

### Data Privacy

- Training data anonymized (no real employee data)
- OpenAI does not retain training data after 30 days
- Fine-tuned models isolated per organization
- No cross-company data leakage

### Audit Trail

All fine-tuning activities logged:
- Who initiated training
- Dataset version used
- Approval chain
- Deployment dates
- Rollback events

### Security Review

- [ ] Dataset reviewed for PII leakage
- [ ] Model outputs tested for bias
- [ ] Safety behaviors verified in evaluation
- [ ] Penetration testing performed
- [ ] Legal/compliance sign-off obtained

---

## Contact & Support

**Model Owner:** AI/ML Team  
**Business Owner:** HR Operations  
**Compliance Contact:** Legal/Data Privacy Team  

**For Issues:**
- Production outage: Escalate to on-call
- Model behavior concerns: File ticket in AI board
- Training requests: Submit RFC to ML team

**Documentation:**
- Training dataset: `data/fine-tuning/README.md`
- Evaluation script: `scripts/evaluate-finetune.ts`
- Deployment guide: `docs/AI_DEPLOYMENT_GUIDE.md` (this doc)

---

**Last Updated:** October 3, 2025  
**Registry Version:** 1.0  
**Next Review:** After first fine-tuned model deployment

