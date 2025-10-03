# AI Assistant Fine-Tuning Dataset

## Overview

This directory contains the fine-tuning dataset for improving the AI assistant's ability to understand casual, slang-heavy, and partially incoherent language while maintaining strict safety and compliance behaviors.

## Dataset: assistant-flex-v1.jsonl

### Purpose

Train the AI assistant to:
- Interpret casual language patterns ("yo", "bro", "u", "thx", "yea")
- Handle typos and abbreviations ("peeps", "n", "4", "bout")
- Understand emojis and internet slang ("fr fr", "lol", "💯")
- Surface assumptions and ask clarifying questions
- Maintain multi-turn conversation context
- **Preserve strict safety behaviors** (compliance, audit, refusal patterns)

### Dataset Composition

**Total Conversations:** 12 multi-turn dialogues  
**Total Messages:** ~120 individual messages  
**Format:** OpenAI Chat Completions format (JSONL)

#### Conversation Types

1. **Slang Leave Booking (2 conversations)**
   - Examples: "yo book some time off for Gary next monday bro"
   - Demonstrates: Clarification flows, leave type selection, confirmation
   - Preserves: Audit requirements, proper documentation

2. **Workflow Brainstorming (2 conversations)**
   - Examples: "i'm thinking of this sick workflow that like emails ppl..."
   - Demonstrates: Exploratory conversation, parameter extraction, structured proposals
   - Preserves: Proper workflow definition, confirmation before creation

3. **Casual Salary Updates (2 conversations)**
   - Examples: "need 2 bump sarahs salary she been killin it lately 💯"
   - Demonstrates: Intent recognition, multi-step data collection
   - Preserves: **CRITICAL** - Audit reason requirements, preview, confirmation

4. **Bulk Actions with Slang (1 conversation)**
   - Examples: "give them all a 10% bump they deserve it fr fr"
   - Demonstrates: Contextual follow-ups, bulk operation handling
   - Preserves: Preview requirements, explicit confirmation, audit logging

5. **Document Upload (1 conversation)**
   - Examples: "lemme upload this contract thing 4 mike"
   - Demonstrates: File handling, employee disambiguation, category suggestions
   - Preserves: Proper categorization, due date tracking

6. **Analytics Queries (2 conversations)**
   - Examples: "gimme sum analytics on whos been here the longest n stuff"
   - Demonstrates: Natural data exploration, follow-up queries
   - Preserves: Clean data presentation, privacy boundaries

7. **Safety Refusals (2 conversations)**
   - Examples: "delete all the ppl in sales lol" and "export everyones salary info"
   - Demonstrates: **CRITICAL** - Polite refusal, explanation of limits, alternative suggestions
   - Preserves: Data privacy, legal compliance, security boundaries

### Labeling Conventions

#### System Message Pattern

Every conversation starts with:
```json
{
  "role": "system",
  "content": "You are an AI assistant for an HR system. You understand casual, slang-heavy, and partially incoherent language. Always clarify missing details, confirm before executing, and maintain audit compliance. Interpret requests generously but ask for clarification when uncertain."
}
```

#### Assistant Response Patterns

**Clarification Requests:**
- Always ask follow-up questions when details are missing
- Present options clearly (numbered lists)
- Use friendly, conversational tone

**Confirmations:**
- Show detailed previews before executing
- Use emojis and formatting for clarity
- Require explicit confirmation ("Shall I...", "Ready to apply?")

**Success Messages:**
- Celebratory tone ("✅ Success!")
- Summary of what was done
- Next steps or undo information

**Refusals:**
- Polite but firm
- Explain *why* (legal, privacy, compliance)
- Offer alternatives
- Educational tone

### Privacy Hygiene

#### Anonymization

All employee names in the dataset are **fictional**:
- Gary, Sarah Johnson, Michael Dowdle, John Smith, etc.
- No real employee data from any actual company

#### Sensitive Data

- Salary figures are realistic but generic
- Email addresses follow `firstname.lastname@company.com` pattern
- No real IRD numbers, bank accounts, or personal identifiers
- Document names are generic ("employment_contract.pdf")

#### Company Context

- Generic "company" references (no real company names)
- Department names are standard (Sales, Marketing, IT, HR)
- Locations are generic or major cities

### Training Considerations

#### Hyperparameters (Recommended)

```bash
# OpenAI Fine-Tuning API
openai api fine_tunes.create \
  -t assistant-flex-v1.jsonl \
  -m gpt-4o-mini-2024-07-18 \
  --n_epochs 3 \
  --batch_size 4 \
  --learning_rate_multiplier 0.1
```

**Rationale:**
- **Model:** gpt-4o-mini for cost-effectiveness and speed
- **Epochs:** 3 to learn patterns without overfitting (small dataset)
- **Batch Size:** 4 (small dataset, prevents instability)
- **Learning Rate:** 0.1 (conservative to preserve base model knowledge)

#### Validation Strategy

Split strategy not needed (all examples are high-quality human-curated).  
Instead, use **hold-out evaluation set** (see `scripts/evaluate-finetune.ts`).

#### Overfitting Checks

Monitor during training:
- Training loss should decrease steadily
- If loss plateaus early, reduce epochs
- If loss oscillates, reduce learning rate

### Dataset Maintenance

#### Adding New Examples

When adding conversations:
1. Follow the JSONL format strictly
2. Include diverse slang patterns
3. Ensure safety behaviors are demonstrated
4. Anonymize any real data
5. Test the new examples manually first

#### Version Control

- **Current Version:** v1 (12 conversations, ~120 messages)
- **Last Updated:** October 3, 2025
- **Next Review:** After first deployment feedback

#### Quality Checklist

Before adding conversations, ensure:
- [ ] Natural, realistic user language
- [ ] Multiple turns (3+ exchanges)
- [ ] At least one clarification or confirmation
- [ ] Safety behavior demonstrated (if applicable)
- [ ] No real personal data
- [ ] Proper JSON formatting
- [ ] System message included

### Known Limitations

1. **Dataset Size:** Small (12 conversations) - may need expansion
2. **Domain Coverage:** Focused on HR workflows - doesn't cover all edge cases
3. **Slang Diversity:** Primarily English slang - no multilingual examples
4. **Persona Consistency:** No specific user persona maintained across conversations
5. **Tool-Calling:** Relies on text completion, not OpenAI function calling

### Future Enhancements

- [ ] Add multilingual slang examples (Spanish, Mandarin, etc.)
- [ ] Include more edge cases (spelling errors, autocorrect fails)
- [ ] Add conversations with sentiment (frustrated, excited users)
- [ ] Create adversarial examples (jailbreak attempts)
- [ ] Expand to 50+ conversations for better coverage
- [ ] Add conversation branches (user changes mind mid-flow)

## Usage

### Fine-Tuning Command

```bash
# Prepare the dataset (validate format)
openai tools fine_tunes.prepare_data -f assistant-flex-v1.jsonl

# Upload and start fine-tuning
openai api fine_tunes.create \
  -t assistant-flex-v1.jsonl \
  -m gpt-4o-mini-2024-07-18 \
  --suffix "corenz-assistant-flex-v1" \
  --n_epochs 3

# Monitor training
openai api fine_tunes.follow -i <fine_tune_id>

# Retrieve fine-tuned model ID
openai api fine_tunes.get -i <fine_tune_id>
```

### Testing Locally

```bash
# Run evaluation script
npx tsx scripts/evaluate-finetune.ts
```

### Deployment

After fine-tuning:
1. Record model ID in `docs/AI_MODEL_REGISTRY.md`
2. Set `OPENAI_FINE_TUNED_MODEL` in `.env.local`
3. Run regression tests
4. Deploy to staging
5. Monitor for 48 hours
6. Promote to production

## Support

For questions or issues with the dataset:
- Review the OpenAI Fine-Tuning docs: https://platform.openai.com/docs/guides/fine-tuning
- Check model registry for versioning: `docs/AI_MODEL_REGISTRY.md`
- Run evaluation script for quality checks

---

**Last Updated:** October 3, 2025  
**Maintained By:** AI/ML Team  
**Version:** 1.0

