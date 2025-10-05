/**
 * CSV Import Assistant
 * Specialized AI capabilities for CSV import guidance and troubleshooting
 */

import { openai, AI_CONFIG } from "./openai-client";
import { getSystemContext } from "./system-context";

export interface CSVGuidanceResult {
  success: boolean;
  message: string;
  suggestions?: string[];
  template?: string;
  errorAnalysis?: string;
  fieldMapping?: Record<string, string>;
}

export async function provideCSVGuidance(
  userQuery: string,
  companyId: string,
  context?: any
): Promise<CSVGuidanceResult> {
  try {
    const systemContext = await getSystemContext(companyId);
    
    const prompt = `You are an expert CSV import assistant for an HR system. Help users understand and troubleshoot CSV imports.

SYSTEM CONTEXT:
${JSON.stringify(systemContext.csvImport, null, 2)}

USER QUERY: ${userQuery}

Available CSV fields and their descriptions:
- firstName, lastName, email (REQUIRED)
- Personal info: phoneNumber, dateOfBirth, gender, street, city, postcode, country, nationalId, pronouns, residencyStatus
- Employment: departmentName, jobRoleName, jobTitle, employmentType, contractType, siteLocation, startDate, contractEndDate, workingPatternName, managerEmail, lineManagerName
- Compensation: salaryAmount, hourlyRate
- Payroll: bankAccountNumber, irdNumber, taxCode, kiwiSaverEnrolled, kiwiSaverContribution
- Emergency contacts: emergencyContactName, emergencyContactRelationship, emergencyContactPhone, emergencyContactEmail
- Compliance: driverLicenceType, driverLicenceNumber, driverLicenceIssueDate, driverLicenceExpiryDate
- Training: trainingCourse, trainingProvider, trainingDateCompleted, trainingExpiryDate
- Employment checks: employmentCheckType, employmentCheckDocumentNumber, employmentCheckIssueDate, employmentCheckExpiryDate
- Leave: holidayTotalBalance, holidayCarryover, holidayCurrentBalance, holidayYear

IMPORTANT RULES:
1. Only firstName, lastName, and email are required
2. Dates should be in YYYY-MM-DD format
3. Employment types: Full Time, Part Time, Contract, Intern, Temporary
4. Contract types: Permanent, Fixed Term, Probationary, Consultant
5. Tax codes: M, ME, M SL, ME SL, SB, SB SL, S, S SL, SH, SH SL, ST, ST SL, SA, SA SL, SL, SED, STC, CAE, EDW, ND, NS, NC, NCC, WT, P
6. Boolean values: Yes/No, True/False, 1/0
7. Departments and job roles must exist in the system before importing employees
8. Manager details must match an existing employee (by email or lineManagerName)
9. Working patterns must exist in the system

Provide helpful, conversational guidance. If the user is asking about:
- Field requirements: explain what's required vs optional
- Data format: show examples of correct formats
- Error troubleshooting: analyze common issues and solutions
- Template creation: provide a sample CSV template
- Field mapping: help map their fields to system fields

Be conversational and helpful, not technical.`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: userQuery,
        },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't process your CSV question.";

    return {
      success: true,
      message: response,
    };
  } catch (error: any) {
    console.error("[CSV Assistant Error]", error);
    return {
      success: false,
      message: "I'm having trouble helping with CSV imports right now. Please try again later.",
    };
  }
}

export async function generateCSVTemplate(
  fields: string[],
  companyId: string
): Promise<CSVGuidanceResult> {
  try {
    const systemContext = await getSystemContext(companyId);
    
    // Get sample data for template
    const sampleDepartments = systemContext.departments.slice(0, 3).map(d => d.name);
    const sampleJobRoles = systemContext.jobRoles.slice(0, 3).map(r => r.name);
    
    const sampleData = {
      firstName: "John",
      lastName: "Doe", 
      email: "john.doe@company.com",
      phoneNumber: "+64 21 555 0101",
      dateOfBirth: "1990-01-15",
      gender: "Male",
      street: "123 Main St",
      city: "Auckland",
      postcode: "1010",
      country: "New Zealand",
      nationalId: "ABC123456",
      pronouns: "he/him",
      residencyStatus: "Citizen",
      holidayTotalBalance: "25",
      holidayCarryover: "3",
      holidayCurrentBalance: "18",
      holidayYear: "2024",
      departmentName: sampleDepartments[0] || "Engineering",
      jobRoleName: sampleJobRoles[0] || "Software Engineer",
      jobTitle: "Senior Software Engineer",
      employmentType: "Full Time",
      contractType: "Permanent",
      siteLocation: "Auckland HQ",
      startDate: "2024-01-08",
      contractEndDate: "",
      workingPatternName: "Standard 40hr",
      managerEmail: "engineering.lead@company.com",
      lineManagerName: "Amelia Clark",
      salaryAmount: "85000",
      hourlyRate: "",
      bankAccountNumber: "12-1234-1234567-00",
      irdNumber: "123-456-789",
      taxCode: "M",
      kiwiSaverEnrolled: "Yes",
      kiwiSaverContribution: "3",
      emergencyContactName: "Jane Doe",
      emergencyContactRelationship: "Spouse",
      emergencyContactPhone: "+64 21 555 0102",
      emergencyContactEmail: "jane.doe@example.com",
      driverLicenceType: "Full",
      driverLicenceNumber: "DL123456",
      driverLicenceIssueDate: "2022-02-10",
      driverLicenceExpiryDate: "2032-02-09",
      trainingCourse: "Health & Safety Induction",
      trainingProvider: "Safety First Ltd",
      trainingDateCompleted: "2024-01-15",
      trainingExpiryDate: "2026-01-15",
      employmentCheckType: "Right to Work",
      employmentCheckDocumentNumber: "RTW-2024-001",
      employmentCheckIssueDate: "2023-12-01",
      employmentCheckExpiryDate: "2025-12-01",
    };

    // Create CSV header
    const csvHeader = fields.join(",");
    
    // Create sample row
    const sampleRow = fields.map(field => {
      const value = sampleData[field as keyof typeof sampleData] || "";
      // Escape values that contain commas or quotes
      if (value.includes(",") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(",");

    const template = `${csvHeader}\n${sampleRow}`;

    return {
      success: true,
      message: `Here's a CSV template with the fields you requested:\n\n\`\`\`csv\n${template}\n\`\`\`\n\n**Important Notes:**\n- Only firstName, lastName, and email are required\n- Dates must be in YYYY-MM-DD format\n- Department and job role names must exist in your system\n- Provide managerEmail or lineManagerName to link reporting lines\n- Boolean values: Yes/No, True/False, or 1/0`,
      template,
    };
  } catch (error: any) {
    console.error("[CSV Template Error]", error);
    return {
      success: false,
      message: "I couldn't generate a CSV template right now. Please try again later.",
    };
  }
}

export async function analyzeCSVErrors(
  errorData: any,
  companyId: string
): Promise<CSVGuidanceResult> {
  try {
    const systemContext = await getSystemContext(companyId);
    
    const prompt = `Analyze these CSV import errors and provide helpful guidance:

ERROR DATA: ${JSON.stringify(errorData, null, 2)}

SYSTEM CONTEXT: ${JSON.stringify(systemContext.csvImport, null, 2)}

Common CSV import issues and solutions:
1. Missing required fields (firstName, lastName, email)
2. Invalid email format
3. Invalid date format (should be YYYY-MM-DD)
4. Department/job role not found in system
5. Manager email not found
6. Invalid employment type or contract type
7. Invalid tax code
8. Invalid boolean values
9. Duplicate email addresses
10. Invalid numeric values

Provide specific, actionable advice for fixing these errors. Be conversational and helpful.`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Please analyze these CSV import errors: ${JSON.stringify(errorData)}`,
        },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't analyze the errors.";

    return {
      success: true,
      message: response,
      errorAnalysis: response,
    };
  } catch (error: any) {
    console.error("[CSV Error Analysis Error]", error);
    return {
      success: false,
      message: "I couldn't analyze the CSV errors right now. Please try again later.",
    };
  }
}

export async function suggestFieldMapping(
  userFields: string[],
  companyId: string
): Promise<CSVGuidanceResult> {
  try {
    const systemContext = await getSystemContext(companyId);
    
    const prompt = `Help map these user CSV fields to the system's available fields:

USER FIELDS: ${JSON.stringify(userFields)}

AVAILABLE SYSTEM FIELDS: ${JSON.stringify(systemContext.csvImport.availableFields)}

Provide a mapping suggestion for each user field. Consider:
- Exact matches (case-insensitive)
- Similar field names
- Common abbreviations
- Alternative field names

Format as a JSON object where keys are user fields and values are system fields.`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Map these fields: ${userFields.join(", ")}`,
        },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't map the fields.";
    
    // Try to extract JSON from response
    let fieldMapping: Record<string, string> = {};
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fieldMapping = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If JSON parsing fails, create a basic mapping
      fieldMapping = {};
      userFields.forEach(field => {
        const lowerField = field.toLowerCase();
        if (lowerField.includes('first') || lowerField.includes('given')) {
          fieldMapping[field] = 'firstName';
        } else if (lowerField.includes('last') || lowerField.includes('surname') || lowerField.includes('family')) {
          fieldMapping[field] = 'lastName';
        } else if (lowerField.includes('email') || lowerField.includes('mail')) {
          fieldMapping[field] = 'email';
        } else if (lowerField.includes('phone') || lowerField.includes('mobile') || lowerField.includes('tel')) {
          fieldMapping[field] = 'phoneNumber';
        } else if (lowerField.includes('department') || lowerField.includes('dept')) {
          fieldMapping[field] = 'departmentName';
        } else if (lowerField.includes('job') || lowerField.includes('role') || lowerField.includes('title')) {
          fieldMapping[field] = 'jobRoleName';
        } else if (lowerField.includes('salary') || lowerField.includes('wage')) {
          fieldMapping[field] = 'salaryAmount';
        } else if (lowerField.includes('start') || lowerField.includes('hire')) {
          fieldMapping[field] = 'startDate';
        }
      });
    }

    return {
      success: true,
      message: response,
      fieldMapping,
    };
  } catch (error: any) {
    console.error("[Field Mapping Error]", error);
    return {
      success: false,
      message: "I couldn't map the fields right now. Please try again later.",
    };
  }
}
