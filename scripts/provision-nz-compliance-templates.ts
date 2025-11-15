/**
 * Provision NZ Compliance Onboarding Templates
 * 
 * Provisions baseline NZ compliance templates for:
 * - New NZ tenants (automatic)
 * - Existing NZ tenants (opt-in migration)
 * 
 * Usage:
 *   tsx scripts/provision-nz-compliance-templates.ts --mode=new
 *   tsx scripts/provision-nz-compliance-templates.ts --mode=migrate --tenant-id=xxx
 *   tsx scripts/provision-nz-compliance-templates.ts --mode=all --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { NZ_CORE_EMPLOYMENT_PRESET, NZ_COMPREHENSIVE_ONBOARDING_PRESET } from '../lib/compliance/nz-compliance-presets';
import type { CompliancePreset } from '../lib/compliance/nz-compliance-presets';
import { validateTemplate } from '../lib/compliance/compliance-validator';
import { isFeatureEnabled } from '../lib/compliance/feature-flags';

const prisma = new PrismaClient();

type ProvisionMode = 'new' | 'migrate' | 'all';

interface ProvisionOptions {
  mode: ProvisionMode;
  tenantId?: string;
  companyId?: string;
  dryRun?: boolean;
  skipValidation?: boolean;
  presetType?: 'core' | 'comprehensive';
}

/**
 * Main provisioning function
 */
async function provisionComplianceTemplates(options: ProvisionOptions) {
  console.log('🚀 Starting NZ Compliance Template Provisioning');
  console.log('Mode:', options.mode);
  console.log('Dry Run:', options.dryRun ? 'Yes' : 'No');
  console.log('---');

  try {
    if (options.mode === 'new') {
      await provisionForNewTenant(options);
    } else if (options.mode === 'migrate' && options.companyId) {
      await provisionForExistingTenant(options);
    } else if (options.mode === 'all') {
      await provisionForAllNZTenants(options);
    } else {
      throw new Error('Invalid mode or missing required parameters');
    }

    console.log('---');
    console.log('✅ Provisioning completed successfully');
  } catch (error) {
    console.error('❌ Provisioning failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Provision templates for a new NZ tenant
 */
async function provisionForNewTenant(options: ProvisionOptions) {
  if (!options.companyId) {
    throw new Error('Company ID required for new tenant provisioning');
  }

  console.log(`📦 Provisioning templates for new tenant: ${options.companyId}`);

  // Check if company exists and is NZ-based
  const company = await prisma.company.findUnique({
    where: { id: options.companyId }
  });

  if (!company) {
    throw new Error(`Company not found: ${options.companyId}`);
  }

  // TODO: Check company region from settings or profile
  const isNZ = true; // Placeholder - implement region check

  if (!isNZ) {
    console.log('⏭️  Skipping non-NZ company');
    return;
  }

  // Check feature flag
  const featureEnabled = isFeatureEnabled(
    'auto_compliance_templates',
    options.companyId,
    'mid_market',
    'NZ'
  );

  if (!featureEnabled) {
    console.log('⏭️  Feature not enabled for this tenant');
    return;
  }

  // Provision core compliance template
  await provisionTemplate(
    NZ_CORE_EMPLOYMENT_PRESET,
    options.companyId,
    'system',
    options.dryRun || false
  );

  console.log('✅ Core compliance template provisioned');
}

/**
 * Provision templates for an existing NZ tenant (opt-in migration)
 */
async function provisionForExistingTenant(options: ProvisionOptions) {
  if (!options.companyId) {
    throw new Error('Company ID required');
  }

  console.log(`🔄 Migrating existing tenant: ${options.companyId}`);

  const company = await prisma.company.findUnique({
    where: { id: options.companyId },
    include: {
      OnboardingTemplate: true
    }
  });

  if (!company) {
    throw new Error(`Company not found: ${options.companyId}`);
  }

  // Check if compliance templates already exist
  const hasComplianceTemplate = company.OnboardingTemplate.some(
    t => t.name.includes('NZ Compliance') || t.name.includes('NZ Core Employment')
  );

  if (hasComplianceTemplate && !options.dryRun) {
    console.log('⚠️  Compliance template already exists - skipping');
    return;
  }

  // Choose preset type
  const preset = options.presetType === 'comprehensive'
    ? NZ_COMPREHENSIVE_ONBOARDING_PRESET
    : NZ_CORE_EMPLOYMENT_PRESET;

  await provisionTemplate(
    preset,
    options.companyId,
    'migration',
    options.dryRun || false
  );

  console.log('✅ Template migrated successfully');
}

/**
 * Provision templates for all eligible NZ tenants
 */
async function provisionForAllNZTenants(options: ProvisionOptions) {
  console.log('🌐 Provisioning for all NZ tenants');

  // Get all companies (in real implementation, filter by region)
  const companies = await prisma.company.findMany({
    include: {
      OnboardingTemplate: true
    }
  });

  console.log(`Found ${companies.length} total companies`);

  let provisioned = 0;
  let skipped = 0;
  let errors = 0;

  for (const company of companies) {
    try {
      // TODO: Check if company is NZ-based from settings
      const isNZ = true; // Placeholder

      if (!isNZ) {
        skipped++;
        continue;
      }

      // Check if already has compliance template
      const hasComplianceTemplate = company.OnboardingTemplate.some(
        t => t.name.includes('NZ Compliance') || t.name.includes('NZ Core Employment')
      );

      if (hasComplianceTemplate) {
        console.log(`⏭️  ${company.name}: Already has compliance template`);
        skipped++;
        continue;
      }

      // Check feature flag
      const featureEnabled = isFeatureEnabled(
        'auto_compliance_templates',
        company.id,
        'mid_market',
        'NZ'
      );

      if (!featureEnabled) {
        console.log(`⏭️  ${company.name}: Feature not enabled`);
        skipped++;
        continue;
      }

      console.log(`📦 ${company.name}: Provisioning...`);

      await provisionTemplate(
        NZ_CORE_EMPLOYMENT_PRESET,
        company.id,
        'batch',
        options.dryRun || false
      );

      provisioned++;
      console.log(`✅ ${company.name}: Done`);

    } catch (error) {
      errors++;
      console.error(`❌ ${company.name}: Failed -`, error);
    }
  }

  console.log('---');
  console.log('Summary:');
  console.log(`  Provisioned: ${provisioned}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

/**
 * Provision a single template from a preset
 */
async function provisionTemplate(
  preset: CompliancePreset,
  companyId: string,
  createdBy: string,
  dryRun: boolean
): Promise<void> {
  console.log(`  Creating template: ${preset.name}`);

  // Validate preset
  const steps = preset.steps.map(s => ({
    id: `step-${s.order}`,
    stepType: s.stepType,
    title: s.title,
    isMandatory: s.isMandatory,
    metadata: s.metadata,
    complianceRequirements: s.complianceRequirements
  }));

  const validation = validateTemplate(steps, { region: preset.region });
  
  if (!validation.isCompliant) {
    console.warn('⚠️  Preset validation failed:');
    validation.errors.forEach(e => console.warn(`    - ${e.message}`));
  } else {
    console.log('  ✓ Validation passed');
  }

  if (dryRun) {
    console.log('  [DRY RUN] Would create template with', preset.steps.length, 'steps');
    return;
  }

  // Create template
  const templateId = `nz-compliance-${Date.now()}`;
  
  const template = await prisma.onboardingTemplate.create({
    data: {
      id: templateId,
      name: preset.name,
      description: preset.description,
      companyId: companyId,
      isDefault: false,
      isActive: true,
      updatedAt: new Date(),
      createdAt: new Date()
    }
  });

  console.log(`  ✓ Template created: ${template.id}`);

  // Create steps
  for (const step of preset.steps) {
    const stepId = `${templateId}-step-${step.order}`;
    
    // Map step type to OnboardingStepType enum
    const stepTypeMapping: Record<string, any> = {
      'acknowledge-document': 'ACKNOWLEDGE_DOCUMENT',
      'upload-document': 'UPLOAD_DOCUMENT',
      'collect-document': 'COLLECT_DOCUMENT',
      'fill-form': 'FORM_FILL',
      'instructions': 'INSTRUCTION',
      'training-assignment': 'TRAINING_ASSIGNMENT',
      'equipment-checklist': 'EQUIPMENT_CHECKLIST',
      'system-access': 'SYSTEM_ACCESS',
      'manager-checkin': 'MANAGER_CHECKIN',
      'buddy-introduction': 'BUDDY_INTRODUCTION',
      'compliance-training': 'COMPLIANCE_TRAINING',
      'payroll-setup': 'PAYROLL_SETUP',
      'benefits-enrollment': 'BENEFITS_ENROLLMENT',
      'probation-goals': 'PROBATION_GOALS',
      'welcome-survey': 'WELCOME_SURVEY',
      'journey-automation': 'JOURNEY_AUTOMATION'
    };
    
    await prisma.onboardingStep.create({
      data: {
        id: stepId,
        templateId: template.id,
        type: stepTypeMapping[step.stepType] || 'INSTRUCTION',
        label: step.title,
        order: step.order,
        instruction: step.description,
        metadata: {
          ...step.metadata,
          complianceRequirements: step.complianceRequirements,
          isMandatory: step.isMandatory,
          assigneeRole: step.assigneeRole,
          daysOffset: step.daysOffset || 0
        } as any,
        slaDays: step.daysOffset || undefined
      }
    });
  }

  console.log(`  ✓ Created ${preset.steps.length} steps`);

  // Log telemetry - using upsert since fingerprint is unique
  const fingerprint = `template-created-${preset.id}-${companyId}`;
  
  try {
    await prisma.onboardingTemplateTelemetryEvent.upsert({
      where: {
        companyId_fingerprint: {
          companyId: companyId,
          fingerprint: fingerprint
        }
      },
      create: {
        companyId: companyId,
        templateId: template.id,
        eventType: 'template_created_from_preset',
        severity: 'info',
        message: `Created template from preset: ${preset.id}`,
        fingerprint: fingerprint,
        details: {
          presetId: preset.id,
          presetName: preset.name,
          stepCount: preset.steps.length,
          createdBy: createdBy
        } as any
      },
      update: {
        lastSeenAt: new Date(),
        occurrenceCount: { increment: 1 }
      }
    });
    console.log(`  ✓ Telemetry logged`);
  } catch (e) {
    console.log(`  ⚠ Telemetry logging skipped (non-critical):`, e instanceof Error ? e.message : e);
  }
}

/**
 * Rollback provisioned templates (for testing/recovery)
 */
async function rollbackProvisionedTemplates(companyId: string, dryRun: boolean = false) {
  console.log(`🔙 Rolling back provisioned templates for: ${companyId}`);

  const templates = await prisma.onboardingTemplate.findMany({
    where: {
      companyId: companyId,
      OR: [
        { name: { contains: 'NZ Compliance' } },
        { name: { contains: 'NZ Core Employment' } },
        { name: { contains: 'NZ Comprehensive' } }
      ]
    },
    include: {
      OnboardingStep: true
    }
  });

  console.log(`Found ${templates.length} templates to remove`);

  if (dryRun) {
    console.log('[DRY RUN] Would delete templates:', templates.map(t => t.name));
    return;
  }

  for (const template of templates) {
    // Delete steps first
    await prisma.onboardingStep.deleteMany({
      where: { templateId: template.id }
    });

    // Delete template
    await prisma.onboardingTemplate.delete({
      where: { id: template.id }
    });

    console.log(`✓ Deleted: ${template.name}`);
  }

  console.log('✅ Rollback complete');
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options: ProvisionOptions = {
    mode: 'new',
    dryRun: false,
    presetType: 'core'
  };

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1] as ProvisionMode;
    } else if (arg.startsWith('--tenant-id=') || arg.startsWith('--company-id=')) {
      options.companyId = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--comprehensive') {
      options.presetType = 'comprehensive';
    } else if (arg.startsWith('--rollback')) {
      if (!options.companyId) {
        throw new Error('Company ID required for rollback');
      }
      await rollbackProvisionedTemplates(options.companyId, options.dryRun);
      return;
    }
  }

  await provisionComplianceTemplates(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { provisionComplianceTemplates, provisionTemplate, rollbackProvisionedTemplates };
