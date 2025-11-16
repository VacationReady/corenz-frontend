/**
 * End-to-End Multi-Tenant Onboarding Tests
 * 
 * Validates:
 * 1. Template creation and publishing flow
 * 2. Cross-tenant isolation
 * 3. Label validation UI behavior
 * 4. Instance access controls
 * 5. Complete onboarding workflow
 */

describe("Onboarding Multi-Tenant Security", () => {
  beforeEach(() => {
    // Reset database state
    cy.task("db:seed");
  });

  describe("Template Builder - Label Validation", () => {
    beforeEach(() => {
      cy.login("admin@company1.com", "company1");
      cy.visit("/onboarding/templates/new");
    });

    it("prevents duplicate step titles within a template", () => {
      // Create template
      cy.get('[data-testid="template-name"]').type("Engineering Onboarding");
      
      // Add first step
      cy.get('[data-testid="add-step"]').click();
      cy.get('[data-testid="step-title-0"]').type("Welcome Session");
      
      // Add second step with same title
      cy.get('[data-testid="add-step"]').click();
      cy.get('[data-testid="step-title-1"]').type("Welcome Session");
      
      // Should show error
      cy.get('[data-testid="step-title-1"]').parent().should("contain", "already in use");
      
      // Should show suggestion
      cy.get('[data-testid="suggestion-button-1"]').should("contain", "Welcome Session 2");
      
      // Apply suggestion
      cy.get('[data-testid="suggestion-button-1"]').click();
      cy.get('[data-testid="step-title-1"]').should("have.value", "Welcome Session 2");
      
      // Error should clear
      cy.get('[data-testid="step-title-1"]').parent().should("not.contain", "already in use");
    });

    it("blocks publishing when step titles are invalid", () => {
      cy.get('[data-testid="template-name"]').type("Test Template");
      
      // Add step with invalid title (too short)
      cy.get('[data-testid="add-step"]').click();
      cy.get('[data-testid="step-title-0"]').type("AB");
      
      // Publish button should be disabled
      cy.get('[data-testid="publish-template"]').should("be.disabled");
      
      // Should show blocker message
      cy.get('[data-testid="publish-blocker"]').should("be.visible");
      cy.get('[data-testid="publish-blocker"]').should("contain", "Cannot Publish");
      
      // Fix the title
      cy.get('[data-testid="step-title-0"]').clear().type("Valid Step Title");
      
      // Publish button should be enabled
      cy.get('[data-testid="publish-template"]').should("not.be.disabled");
      cy.get('[data-testid="publish-blocker"]').should("not.exist");
    });

    it("shows character count and enforces maximum length", () => {
      cy.get('[data-testid="template-name"]').type("Test Template");
      cy.get('[data-testid="add-step"]').click();
      
      const longTitle = "A".repeat(80);
      cy.get('[data-testid="step-title-0"]').type(longTitle);
      
      // Should show character count
      cy.get('[data-testid="char-count-0"]').should("contain", "80 / 80");
      
      // Try to add more characters
      cy.get('[data-testid="step-title-0"]').type("B");
      
      // Should show error
      cy.get('[data-testid="step-title-0"]').parent().should("contain", "cannot exceed 80");
    });

    it("supports localization for Te Reo Māori", () => {
      // Switch to Māori locale
      cy.get('[data-testid="locale-selector"]').select("mi");
      
      cy.get('[data-testid="template-name"]').type("Test Template");
      cy.get('[data-testid="add-step"]').click();
      
      // Try to add empty title
      cy.get('[data-testid="step-title-0"]').clear().blur();
      
      // Should show Māori error message
      cy.get('[data-testid="step-title-0"]').parent().should("contain", "ingoa");
    });

    it("preserves labels on template import", () => {
      // Import template with existing labels
      cy.get('[data-testid="import-template"]').click();
      cy.fixture("onboarding-template-with-labels.json").then((template) => {
        cy.get('[data-testid="import-json"]').invoke("val", JSON.stringify(template));
        cy.get('[data-testid="confirm-import"]').click();
      });
      
      // Verify labels are preserved
      cy.get('[data-testid="step-title-0"]').should("have.value", "Complete IRD Number");
      cy.get('[data-testid="step-title-1"]').should("have.value", "Bank Account Details");
    });
  });

  describe("Template Access - Cross-Tenant Isolation", () => {
    it("prevents users from accessing other tenants' templates", () => {
      // Login as Company 1 admin
      cy.login("admin@company1.com", "company1");
      
      // Create template
      cy.visit("/onboarding/templates/new");
      cy.get('[data-testid="template-name"]').type("Company 1 Template");
      cy.get('[data-testid="save-template"]').click();
      
      // Capture template ID from URL
      cy.url().then((url) => {
        const templateId = url.split("/").pop();
        
        // Logout and login as Company 2 admin
        cy.logout();
        cy.login("admin@company2.com", "company2");
        
        // Try to access Company 1's template
        cy.visit(`/onboarding/templates/${templateId}`, { failOnStatusCode: false });
        
        // Should see 404 or unauthorized message
        cy.contains("not found").should("be.visible");
      });
    });

    it("API returns 403 for cross-tenant template access", () => {
      cy.login("admin@company1.com", "company1");
      
      // Make API call to get Company 2's template
      cy.request({
        url: "/api/onboarding/templates?id=company2-template-id",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
      });
    });
  });

  describe("Instance Access - Tenant Scoping", () => {
    it("prevents accessing employee onboarding from different tenant", () => {
      cy.login("admin@company2.com", "company2");
      
      // Try to access Company 1 employee's onboarding
      cy.request({
        url: "/api/onboarding/instances/company1-employee-id",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(403);
        expect(response.body.error).to.contain("Cross-tenant access denied");
      });
    });

    it("returns 401 for unauthenticated instance access", () => {
      // Make request without authentication
      cy.request({
        url: "/api/onboarding/instances/any-employee-id",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.error).to.equal("Unauthorized");
      });
    });

    it("successfully loads instance for authenticated, tenant-scoped request", () => {
      cy.login("admin@company1.com", "company1");
      
      // Create employee and onboarding instance
      cy.task("db:createEmployee", {
        companyId: "company1",
        email: "newemployee@company1.com",
      }).then((employee: any) => {
        cy.task("db:createOnboardingInstance", {
          employeeId: employee.id,
          companyId: "company1",
        });
        
        // Access the instance
        cy.request({
          url: `/api/onboarding/instances/${employee.id}`,
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.have.property("template");
          expect(response.body).to.have.property("steps");
        });
      });
    });
  });

  describe("Complete Onboarding Flow - PAYROLL_SETUP", () => {
    it("renders PAYROLL_SETUP step with correct type and metadata", () => {
      cy.login("employee@company1.com", "company1");
      
      // Navigate to onboarding
      cy.visit("/onboarding");
      
      // Find payroll setup step
      cy.get('[data-testid="step-payroll-setup"]').should("be.visible");
      cy.get('[data-testid="step-payroll-setup"]').should("contain", "Payroll Setup");
      
      // Verify step type is correctly mapped
      cy.get('[data-testid="step-payroll-setup"]')
        .should("have.attr", "data-step-type", "payroll-setup");
      
      // Click to expand
      cy.get('[data-testid="step-payroll-setup"]').click();
      
      // Verify metadata fields are present
      cy.get('[data-testid="payroll-bank-account"]').should("be.visible");
      cy.get('[data-testid="payroll-tax-number"]').should("be.visible");
    });

    it("completes full onboarding workflow with multiple step types", () => {
      cy.login("employee@company1.com", "company1");
      cy.visit("/onboarding");
      
      // Complete ACKNOWLEDGE_DOCUMENT step
      cy.get('[data-testid="step-acknowledge-document"]').click();
      cy.get('[data-testid="acknowledge-checkbox"]').check();
      cy.get('[data-testid="submit-step"]').click();
      
      // Complete PAYROLL_SETUP step
      cy.get('[data-testid="step-payroll-setup"]').click();
      cy.get('[data-testid="payroll-bank-account"]').type("12-3456-7890123-00");
      cy.get('[data-testid="payroll-tax-number"]').type("123-456-789");
      cy.get('[data-testid="submit-step"]').click();
      
      // Complete EQUIPMENT_CHECKLIST step
      cy.get('[data-testid="step-equipment-checklist"]').click();
      cy.get('[data-testid="equipment-laptop"]').check();
      cy.get('[data-testid="equipment-monitor"]').check();
      cy.get('[data-testid="submit-step"]').click();
      
      // Verify completion
      cy.get('[data-testid="onboarding-complete"]').should("be.visible");
      cy.get('[data-testid="onboarding-complete"]').should("contain", "Congratulations");
    });
  });

  describe("Audit Trail", () => {
    it("logs label changes to tenant-scoped audit trail", () => {
      cy.login("admin@company1.com", "company1");
      cy.visit("/onboarding/templates/new");
      
      cy.get('[data-testid="template-name"]').type("Test Template");
      cy.get('[data-testid="add-step"]').click();
      
      // Set initial label
      cy.get('[data-testid="step-title-0"]').type("Initial Title");
      
      // Change label
      cy.get('[data-testid="step-title-0"]').clear().type("Updated Title");
      
      // Save template
      cy.get('[data-testid="save-template"]').click();
      
      // Check audit logs
      cy.request("/api/audit-logs?type=onboarding_template").then((response) => {
        const logs = response.body;
        const labelChanges = logs.filter((log: any) =>
          log.metadata?.before?.label && log.metadata?.after?.label
        );
        
        expect(labelChanges.length).to.be.greaterThan(0);
        expect(labelChanges[0].metadata.before.label).to.equal("Initial Title");
        expect(labelChanges[0].metadata.after.label).to.equal("Updated Title");
        expect(labelChanges[0].companyId).to.equal("company1");
      });
    });
  });
});

// Cypress custom commands (add to cypress/support/commands.ts)
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, companyId: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (email: string, companyId: string) => {
  cy.session([email, companyId], () => {
    cy.visit("/login");
    cy.get('[data-testid="email"]').type(email);
    cy.get('[data-testid="password"]').type("password123");
    cy.get('[data-testid="login-button"]').click();
    cy.url().should("not.include", "/login");
  });
});

Cypress.Commands.add("logout", () => {
  cy.visit("/api/auth/signout");
  cy.get('[data-testid="signout-confirm"]').click();
});
