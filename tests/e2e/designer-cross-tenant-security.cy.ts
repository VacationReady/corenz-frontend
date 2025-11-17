/**
 * E2E Security Tests: Cross-Tenant Isolation for Designer APIs
 * 
 * These tests verify that onboarding templates and journey templates
 * are properly scoped to tenants and cannot be accessed or modified
 * across tenant boundaries.
 * 
 * Critical security requirement from SCREEN_DESIGNER_PRODUCTION_AUDIT.md
 */

describe('Designer API Cross-Tenant Security', () => {
  let tenant1CompanyId: string;
  let tenant2CompanyId: string;
  let tenant1AdminToken: string;
  let tenant2AdminToken: string;
  let tenant1TemplateId: string;
  let tenant2TemplateId: string;
  let tenant1JourneyId: string;
  let tenant2JourneyId: string;

  before(() => {
    // Setup two separate tenants with test data
    cy.task('db:seed', { scenario: 'multi-tenant-security-test' }).then((result: any) => {
      tenant1CompanyId = result.tenant1.companyId;
      tenant2CompanyId = result.tenant2.companyId;
      tenant1AdminToken = result.tenant1.adminToken;
      tenant2AdminToken = result.tenant2.adminToken;
      tenant1TemplateId = result.tenant1.templateId;
      tenant2TemplateId = result.tenant2.templateId;
      tenant1JourneyId = result.tenant1.journeyId;
      tenant2JourneyId = result.tenant2.journeyId;
    });
  });

  after(() => {
    // Cleanup test data
    cy.task('db:cleanup', { scenario: 'multi-tenant-security-test' });
  });

  describe('Onboarding Templates - Cross-Tenant Protection', () => {
    it('should prevent tenant1 from fetching tenant2 template by ID', () => {
      cy.request({
        method: 'GET',
        url: `/api/onboarding/templates?id=${tenant2TemplateId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should prevent tenant1 from updating tenant2 template', () => {
      cy.request({
        method: 'PUT',
        url: '/api/onboarding/templates',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          id: tenant2TemplateId,
          name: 'Malicious Update',
          description: 'Attempting cross-tenant modification',
          steps: [],
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([404, 403]);
        expect(response.body.error).to.exist;
      });
    });

    it('should prevent tenant1 from deleting tenant2 template', () => {
      cy.request({
        method: 'DELETE',
        url: '/api/onboarding/templates',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          id: tenant2TemplateId,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });

      // Verify tenant2 template still exists
      cy.request({
        method: 'GET',
        url: `/api/onboarding/templates?id=${tenant2TemplateId}`,
        headers: {
          Authorization: `Bearer ${tenant2AdminToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.id).to.equal(tenant2TemplateId);
      });
    });

    it('should prevent tenant1 from accessing tenant2 template steps', () => {
      cy.request({
        method: 'GET',
        url: `/api/onboarding-templates/${tenant2TemplateId}/steps`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should prevent tenant1 from creating steps in tenant2 template', () => {
      cy.request({
        method: 'POST',
        url: `/api/onboarding-templates/${tenant2TemplateId}/steps`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          type: 'task',
          label: 'Malicious Step',
          order: 1,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should only return templates for the authenticated tenant', () => {
      cy.request({
        method: 'GET',
        url: '/api/onboarding/templates',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
        
        // Verify all returned templates belong to tenant1
        response.body.forEach((template: any) => {
          expect(template.id).to.not.equal(tenant2TemplateId);
        });
      });
    });

    it('should prevent GraphQL queries from accessing cross-tenant templates', () => {
      cy.request({
        method: 'POST',
        url: '/api/onboarding/templates/graphql',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          operationName: 'OnboardingTemplates',
          query: '{ onboardingTemplates { id name } }',
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        const templates = response.body.data?.onboardingTemplates || [];
        
        // Verify tenant2 template is not in results
        const tenant2Template = templates.find((t: any) => t.id === tenant2TemplateId);
        expect(tenant2Template).to.be.undefined;
      });
    });
  });

  describe('Journey Templates - Cross-Tenant Protection', () => {
    it('should prevent tenant1 from fetching tenant2 journey', () => {
      cy.request({
        method: 'GET',
        url: `/api/journeys/${tenant2JourneyId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should prevent tenant1 from updating tenant2 journey', () => {
      cy.request({
        method: 'PUT',
        url: `/api/journeys/${tenant2JourneyId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          name: 'Malicious Update',
          description: 'Attempting cross-tenant modification',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should prevent tenant1 from deleting tenant2 journey', () => {
      cy.request({
        method: 'DELETE',
        url: `/api/journeys/${tenant2JourneyId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });

      // Verify tenant2 journey still exists
      cy.request({
        method: 'GET',
        url: `/api/journeys/${tenant2JourneyId}`,
        headers: {
          Authorization: `Bearer ${tenant2AdminToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.id).to.equal(tenant2JourneyId);
      });
    });

    it('should prevent tenant1 from publishing tenant2 journey', () => {
      cy.request({
        method: 'POST',
        url: `/api/journeys/${tenant2JourneyId}/publish`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.error).to.include('not found');
      });
    });

    it('should only return journeys for the authenticated tenant', () => {
      cy.request({
        method: 'GET',
        url: '/api/journeys',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
        
        // Verify all returned journeys belong to tenant1
        response.body.forEach((journey: any) => {
          expect(journey.id).to.not.equal(tenant2JourneyId);
        });
      });
    });

    it('should prevent tenant1 from accessing tenant2 journey metadata', () => {
      cy.request({
        method: 'GET',
        url: `/api/journeys/metadata?templateId=${tenant2JourneyId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        
        // Verify tenant2 journey is not in the metadata response
        const templates = response.body.templates || [];
        const tenant2Journey = templates.find((t: any) => t.id === tenant2JourneyId);
        expect(tenant2Journey).to.be.undefined;
      });
    });

    it('should prevent tenant1 from validating journey IDs against tenant2 templates', () => {
      // This test ensures journey ID validation is scoped to tenant
      cy.request({
        method: 'POST',
        url: '/api/journeys/ids',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          journeyId: 'test-journey-id-123',
          templateId: tenant2JourneyId,
        },
        failOnStatusCode: false,
      }).then((response) => {
        // Should succeed because tenant1 can't see tenant2's journey
        // so the ID appears available to them
        expect(response.status).to.equal(200);
      });
    });
  });

  describe('Permission Validation', () => {
    it('should enforce onboarding read permissions for templates', () => {
      // Create a user with no onboarding permissions
      cy.task('db:createUser', {
        companyId: tenant1CompanyId,
        role: 'USER',
        permissions: { onboarding: { read: false, edit: false } },
      }).then((user: any) => {
        cy.request({
          method: 'GET',
          url: '/api/onboarding/templates',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(403);
          expect(response.body.error).to.include('permission');
        });
      });
    });

    it('should enforce onboarding edit permissions for template mutations', () => {
      // Create a user with read-only onboarding permissions
      cy.task('db:createUser', {
        companyId: tenant1CompanyId,
        role: 'USER',
        permissions: { onboarding: { read: true, edit: false } },
      }).then((user: any) => {
        cy.request({
          method: 'POST',
          url: '/api/onboarding/templates',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: {
            name: 'Test Template',
            description: 'Should fail',
            steps: [],
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(403);
          expect(response.body.error).to.include('permission');
        });
      });
    });
  });

  describe('Resource Validation - Prevent Cross-Tenant Resource References', () => {
    it('should reject template creation with cross-tenant document references', () => {
      cy.task('db:createDocument', {
        companyId: tenant2CompanyId,
      }).then((document: any) => {
        cy.request({
          method: 'POST',
          url: '/api/onboarding/templates',
          headers: {
            Authorization: `Bearer ${tenant1AdminToken}`,
          },
          body: {
            name: 'Test Template',
            description: 'With cross-tenant document',
            steps: [
              {
                type: 'document-acknowledgement',
                label: 'Malicious Step',
                order: 1,
                documentId: document.id,
              },
            ],
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(400);
          expect(response.body.error).to.include('belong to the current company');
        });
      });
    });

    it('should reject template creation with cross-tenant form references', () => {
      cy.task('db:createForm', {
        companyId: tenant2CompanyId,
      }).then((form: any) => {
        cy.request({
          method: 'POST',
          url: '/api/onboarding/templates',
          headers: {
            Authorization: `Bearer ${tenant1AdminToken}`,
          },
          body: {
            name: 'Test Template',
            description: 'With cross-tenant form',
            steps: [
              {
                type: 'form',
                label: 'Malicious Step',
                order: 1,
                formId: form.id,
              },
            ],
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(400);
          expect(response.body.error).to.include('belong to the current company');
        });
      });
    });

    it('should reject template creation with cross-tenant department references', () => {
      cy.task('db:createDepartment', {
        companyId: tenant2CompanyId,
      }).then((department: any) => {
        cy.request({
          method: 'POST',
          url: '/api/onboarding/templates',
          headers: {
            Authorization: `Bearer ${tenant1AdminToken}`,
          },
          body: {
            name: 'Test Template',
            description: 'With cross-tenant department',
            departments: [department.id],
            steps: [],
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.equal(400);
          expect(response.body.error).to.include('belong to the current company');
        });
      });
    });

    it('should reject template creation with cross-tenant journey references', () => {
      cy.request({
        method: 'POST',
        url: '/api/onboarding/templates',
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        body: {
          name: 'Test Template',
          description: 'With cross-tenant journey',
          steps: [
            {
              type: 'journey-automation',
              label: 'Malicious Step',
              order: 1,
              metadata: {
                journeyTemplateId: tenant2JourneyId,
              },
            },
          ],
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.error).to.include('belong to the current company');
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log cross-tenant access attempts in telemetry', () => {
      // Attempt cross-tenant access
      cy.request({
        method: 'GET',
        url: `/api/onboarding/templates?id=${tenant2TemplateId}`,
        headers: {
          Authorization: `Bearer ${tenant1AdminToken}`,
        },
        failOnStatusCode: false,
      });

      // Check telemetry logs for security event
      cy.task('db:getTelemetry', {
        companyId: tenant1CompanyId,
        eventType: 'template_load_failure',
      }).then((events: any[]) => {
        const crossTenantAttempt = events.find(
          (e) => e.metadata?.templateId === tenant2TemplateId
        );
        expect(crossTenantAttempt).to.exist;
        expect(crossTenantAttempt.severity).to.equal('error');
      });
    });
  });
});
