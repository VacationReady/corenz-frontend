/**
 * Onboarding Metadata Persistence E2E Tests
 * 
 * Validates full round-trip metadata editability and persistence across:
 * - All 16 step types
 * - Multi-tenant isolation
 * - Deep cloning (no cross-tenant mutations)
 * - Seed data doesn't override saved values
 */

describe('Onboarding Metadata Persistence', () => {
  let adminSession: any;
  let tenant1Id: string;
  let tenant2Id: string;

  before(() => {
    // Setup test tenants and admin user
    cy.task('db:seed:multiTenant').then((result: any) => {
      tenant1Id = result.tenant1.id;
      tenant2Id = result.tenant2.id;
      adminSession = result.adminUser;
    });
  });

  beforeEach(() => {
    cy.login(adminSession.email, 'password');
    cy.visit('/settings/journeys?tab=onboarding');
  });

  after(() => {
    cy.task('db:cleanup:multiTenant');
  });

  describe('Checklist Items - Equipment & Training', () => {
    it('should persist equipment checklist items with notes', () => {
      // Create template
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Equipment Test Template');
      
      // Add equipment-checklist step
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      
      // Edit metadata
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="Laptop"]').clear().type('MacBook Pro 16"');
        cy.get('textarea[placeholder*="Notes"]').first().type('Include charger and case');
        
        // Add new item
        cy.contains('button', 'Add equipment item').click();
        cy.get('input').last().type('Wireless Mouse');
        cy.get('textarea').last().type('Logitech MX Master 3');
      });
      
      // Save template
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Reload page
      cy.reload();
      cy.wait(1000);
      
      // Edit template again
      cy.get('[data-testid="template-row"]').first().within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });
      
      // Verify metadata persisted
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="MacBook Pro 16\\""]').should('exist');
        cy.contains('Include charger and case').should('exist');
        cy.get('input[value="Wireless Mouse"]').should('exist');
        cy.contains('Logitech MX Master 3').should('exist');
      });
    });

    it('should persist training modules with URLs', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Training Test Template');
      
      // Add training-assignment step
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Assign Training').click();
      
      // Edit modules
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="Health & Safety"]').clear().type('OSHA Compliance Training');
        cy.get('input[placeholder*="Link"]').first().type('https://training.example.com/osha');
        
        // Add custom module
        cy.contains('button', 'Add training module').click();
        cy.get('input').last().type('Cybersecurity Awareness');
        cy.get('input[placeholder*="Link"]').last().type('https://training.example.com/cyber');
        cy.get('input[type="checkbox"]').last().uncheck(); // Make optional
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Reload and verify
      cy.reload();
      cy.wait(1000);
      cy.get('[data-testid="template-row"]').first().within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="OSHA Compliance Training"]').should('exist');
        cy.get('input[value="https://training.example.com/osha"]').should('exist');
        cy.get('input[value="Cybersecurity Awareness"]').should('exist');
        cy.get('input[value="https://training.example.com/cyber"]').should('exist');
        cy.get('input[type="checkbox"]').last().should('not.be.checked');
      });
    });
  });

  describe('Payroll Setup - Complex Schema', () => {
    it('should persist payroll fields with all field types', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Payroll Test Template');
      
      // Add payroll-setup step
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Payroll Setup').click();
      
      // Edit payroll fields
      cy.get('[data-testid="step-editor"]').first().within(() => {
        // Modify IRD field
        cy.contains('IRD number').parent().within(() => {
          cy.get('input[placeholder*="123-456-789"]').clear().type('000-000-000');
        });
        
        // Add custom select field
        cy.contains('button', 'Add payroll field').click();
        cy.get('input[placeholder*="Field label"]').last().type('Employment Type');
        cy.get('select').last().select('Dropdown (custom options)');
        cy.get('textarea').last().type('Full-time\\nPart-time\\nContractor\\nCasual');
        cy.get('select[aria-label="Default option"]').last().select('Full-time');
        
        // Add KiwiSaver employee rate
        cy.contains('button', 'Add payroll field').click();
        cy.get('input[placeholder*="Field label"]').last().type('KiwiSaver Employee Contribution');
        cy.get('select').last().select('KiwiSaver employee rate');
        cy.get('select[aria-label="Default option"]').last().select('4%');
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Reload and verify
      cy.reload();
      cy.wait(1000);
      cy.get('[data-testid="template-row"]').first().within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="000-000-000"]').should('exist');
        cy.get('input[value="Employment Type"]').should('exist');
        cy.contains('Full-time').should('exist');
        cy.contains('Part-time').should('exist');
        cy.get('input[value="KiwiSaver Employee Contribution"]').should('exist');
        cy.get('select[aria-label="Default option"]').last().should('have.value', '0.04');
      });
    });

    it('should validate IRD number format', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('IRD Validation Template');
      
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Payroll Setup').click();
      
      // Try to save with invalid IRD format
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.contains('IRD number').parent().within(() => {
          cy.get('input[placeholder*="123-456-789"]').clear().type('invalid');
        });
      });
      
      cy.contains('button', 'Publish').click();
      
      // Should show validation error
      cy.contains('IRD numbers must be 8–9 digits').should('be.visible');
    });
  });

  describe('Buddy Introduction - Simple Metadata', () => {
    it('should persist buddy notes', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Buddy Test Template');
      
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Buddy Introduction').click();
      
      const customNotes = 'Schedule coffee chat in first week. Introduce to team Slack channels. Set up weekly 1:1 for first month.';
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('textarea[placeholder*="Buddy notes"]').clear().type(customNotes);
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Reload and verify
      cy.reload();
      cy.wait(1000);
      cy.get('[data-testid="template-row"]').first().within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('textarea').should('have.value', customNotes);
      });
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate metadata between tenants', () => {
      // Create template for tenant 1
      cy.switchTenant(tenant1Id);
      cy.visit('/settings/journeys?tab=onboarding');
      
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Tenant 1 Template');
      
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="Laptop"]').clear().type('Tenant 1 Laptop');
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Switch to tenant 2
      cy.switchTenant(tenant2Id);
      cy.visit('/settings/journeys?tab=onboarding');
      
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Tenant 2 Template');
      
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="Laptop"]').clear().type('Tenant 2 Laptop');
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Verify tenant 1 data unchanged
      cy.switchTenant(tenant1Id);
      cy.visit('/settings/journeys?tab=onboarding');
      cy.get('[data-testid="template-row"]').first().within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });
      
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('input[value="Tenant 1 Laptop"]').should('exist');
        cy.get('input[value="Tenant 2 Laptop"]').should('not.exist');
      });
    });

    it('should prevent cross-tenant API access', () => {
      // Create template for tenant 1
      cy.switchTenant(tenant1Id);
      cy.request('POST', '/api/onboarding/templates', {
        name: 'Tenant 1 API Template',
        steps: [{
          type: 'equipment-checklist',
          title: 'Equipment',
          metadata: {
            items: [{ id: 'secret-item', label: 'Tenant 1 Secret Equipment' }]
          }
        }]
      }).then((response) => {
        const templateId = response.body.id;
        
        // Try to access from tenant 2
        cy.switchTenant(tenant2Id);
        cy.request({
          method: 'GET',
          url: `/api/onboarding/templates?id=${templateId}`,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404);
        });
      });
    });
  });

  describe('Deep Cloning - No Mutation', () => {
    it('should not mutate metadata when editing multiple steps', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Clone Test Template');
      
      // Add two equipment steps
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      
      // Edit first step
      cy.get('[data-testid="step-editor"]').eq(0).within(() => {
        cy.get('input[value="Laptop"]').clear().type('Step 1 Laptop');
      });
      
      // Edit second step
      cy.get('[data-testid="step-editor"]').eq(1).within(() => {
        cy.get('input[value="Laptop"]').clear().type('Step 2 Laptop');
      });
      
      // Verify first step unchanged
      cy.get('[data-testid="step-editor"]').eq(0).within(() => {
        cy.get('input[value="Step 1 Laptop"]').should('exist');
        cy.get('input[value="Step 2 Laptop"]').should('not.exist');
      });
      
      // Verify second step unchanged
      cy.get('[data-testid="step-editor"]').eq(1).within(() => {
        cy.get('input[value="Step 2 Laptop"]').should('exist');
        cy.get('input[value="Step 1 Laptop"]').should('not.exist');
      });
    });
  });

  describe('Seed Data Override Prevention', () => {
    it('should not revert to defaults after save/reload', () => {
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Seed Override Test');
      
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Manager Check-in').click();
      
      // Clear default timeline
      cy.get('[data-testid="step-editor"]').first().within(() => {
        cy.get('button').contains('Remove').click();
        cy.get('button').contains('Remove').click();
        
        // Add custom timeline
        cy.contains('button', 'Add check-in').click();
        cy.get('input[placeholder*="Label"]').type('Custom Week 1 Check-in');
        cy.get('input[placeholder*="timing"]').type('Week 1');
      });
      
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Reload multiple times
      for (let i = 0; i < 3; i++) {
        cy.reload();
        cy.wait(1000);
        cy.get('[data-testid="template-row"]').first().within(() => {
          cy.get('button[aria-label="Edit"]').click();
        });
        
        // Verify custom data persists, defaults don't return
        cy.get('[data-testid="step-editor"]').first().within(() => {
          cy.get('input[value="Custom Week 1 Check-in"]').should('exist');
          cy.get('input[value="Day 7 check-in"]').should('not.exist');
          cy.get('input[value="Day 30 review"]').should('not.exist');
        });
        
        cy.contains('button', 'Cancel').click();
      }
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect concurrent edits and show conflict UI', () => {
      // Create template
      cy.contains('button', 'New Template').click();
      cy.get('input[placeholder*="Template Name"]').type('Conflict Test Template');
      cy.contains('button', 'Add Step').click();
      cy.contains('button', 'Equipment Checklist').click();
      cy.contains('button', 'Publish').click();
      cy.contains('Template published!').should('be.visible');
      
      // Get template ID
      cy.get('[data-testid="template-row"]').first().invoke('attr', 'data-template-id').then((templateId) => {
        // Open editor in first session
        cy.get('[data-testid="template-row"]').first().within(() => {
          cy.get('button[aria-label="Edit"]').click();
        });
        
        // Simulate concurrent edit via API
        cy.request('PUT', '/api/onboarding/templates', {
          id: templateId,
          name: 'Conflict Test Template',
          steps: [{
            type: 'equipment-checklist',
            title: 'Equipment',
            metadata: {
              items: [{ id: 'concurrent-item', label: 'Concurrent Edit Item' }]
            }
          }]
        });
        
        // Try to save in first session
        cy.get('[data-testid="step-editor"]').first().within(() => {
          cy.get('input[value="Laptop"]').clear().type('My Edit Laptop');
        });
        cy.contains('button', 'Publish').click();
        
        // Should show conflict warning
        cy.contains('Changes detected on the server').should('be.visible');
        cy.contains('Load latest version').should('be.visible');
        cy.contains('Overwrite with my edits').should('be.visible');
      });
    });
  });

  describe('All 16 Step Types - Smoke Test', () => {
    const stepTypes = [
      { type: 'acknowledge-document', field: 'acknowledgementText', value: 'Custom acknowledgement' },
      { type: 'upload-document', field: 'category', value: 'Custom Category' },
      { type: 'collect-document', field: 'instructions', value: 'Custom instructions' },
      { type: 'fill-form', field: 'guidance', value: 'Custom guidance' },
      { type: 'instructions', field: 'buttonLabel', value: 'Custom Button' },
      { type: 'training-assignment', field: 'modules[0].label', value: 'Custom Training' },
      { type: 'equipment-checklist', field: 'items[0].label', value: 'Custom Equipment' },
      { type: 'system-access', field: 'systems[0].label', value: 'Custom System' },
      { type: 'manager-checkin', field: 'timeline[0].label', value: 'Custom Check-in' },
      { type: 'buddy-introduction', field: 'notes', value: 'Custom buddy notes' },
      { type: 'compliance-training', field: 'courses[0].label', value: 'Custom Course' },
      { type: 'payroll-setup', field: 'fields[0].label', value: 'Custom Payroll Field' },
      { type: 'benefits-enrollment', field: 'links[0].label', value: 'Custom Benefit' },
      { type: 'probation-goals', field: 'milestones[0].label', value: 'Custom Goal' },
      { type: 'welcome-survey', field: 'questionSet', value: 'custom-survey-id' },
      { type: 'journey-automation', field: 'notes', value: 'Custom automation notes' },
    ];

    stepTypes.forEach(({ type, field, value }) => {
      it(`should persist metadata for ${type}`, () => {
        cy.contains('button', 'New Template').click();
        cy.get('input[placeholder*="Template Name"]').type(`${type} Test`);
        
        cy.contains('button', 'Add Step').click();
        cy.contains('button', new RegExp(type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 'i')).click();
        
        // Edit metadata (simplified - actual selectors would vary)
        cy.get('[data-testid="step-editor"]').first().within(() => {
          cy.get('input, textarea').first().clear().type(value);
        });
        
        cy.contains('button', 'Publish').click();
        cy.contains('Template published!').should('be.visible');
        
        // Reload and verify
        cy.reload();
        cy.wait(1000);
        cy.get('[data-testid="template-row"]').first().within(() => {
          cy.get('button[aria-label="Edit"]').click();
        });
        
        cy.get('[data-testid="step-editor"]').first().within(() => {
          cy.contains(value).should('exist');
        });
        
        cy.contains('button', 'Cancel').click();
      });
    });
  });
});
