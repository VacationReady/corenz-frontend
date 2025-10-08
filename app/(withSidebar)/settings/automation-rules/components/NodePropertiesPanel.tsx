import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { actionTypes } from "../config/actionTypes";
import { conditionTypes } from "../config/conditionTypes";
import { MultiSelect } from "@/components/ui/MultiSelect";

export function NodePropertiesPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: any;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="p-4 text-center">
        <div className="text-xs text-muted-foreground">Click a node to edit its properties</div>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm font-semibold">{node.data?.label ?? node.type}</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">Display Name</label>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={node.data?.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder={`e.g., ${node.type === "trigger" ? "When employee joins" : node.type === "action" ? "Send welcome email" : node.type}`}
          />
        </div>
        {node.type === "trigger" && (
          <div>
            <label className="block text-xs font-medium mb-1">Trigger Event</label>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={node.data?.config?.triggerType || "EMPLOYEE_CREATED"}
              onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), triggerType: e.target.value } })}
            >
              <option value="EMPLOYEE_CREATED">Employee Created</option>
              <option value="EMPLOYEE_START_DATE">Employee Start Date</option>
              <option value="DOCUMENT_EXPIRING">Document Expiring</option>
              <option value="FORM_SUBMITTED">Form Submitted</option>
              <option value="LEAVE_REQUEST">Leave Request</option>
              <option value="CONTRACT_EXPIRING">Contract Expiring</option>
              <option value="PERFORMANCE_REVIEW_COMPLETED">Performance Review Completed</option>
              <option value="ONBOARDING_STEP_COMPLETED">Onboarding Step Completed</option>
              <option value="SCHEDULED">Scheduled (Cron)</option>
              <option value="MANUAL">Manual Trigger</option>
            </select>
          </div>
        )}
        {node.type === "action" && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Action Type</label>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={node.data?.actionType || "send_email"}
                onChange={(e) => onUpdate({ actionType: e.target.value })}
              >
                <optgroup label="Communication">
                  <option value="send_email">📧 Send Email</option>
                  <option value="send_manager_reminder">👤 Remind Manager</option>
                </optgroup>
                <optgroup label="Action Items">
                  <option value="create_action_item">✅ Create Action Item</option>
                </optgroup>
                <optgroup label="Forms & Documents">
                  <option value="assign_form">📝 Assign Form</option>
                  <option value="request_document_upload">📎 Request Document Upload</option>
                  <option value="request_document_acknowledgement">✍️ Request Doc Acknowledgement</option>
                </optgroup>
                <optgroup label="Offboarding">
                  <option value="create_offboarding_task">🚪 Add Offboarding Task</option>
                </optgroup>
                <optgroup label="Employee Updates">
                  <option value="update_employee_field">✏️ Update Field</option>
                  <option value="adjust_leave_balance">🏝️ Adjust Leave Balance</option>
                </optgroup>
                <optgroup label="Training & Performance">
                  <option value="assign_training">🎓 Assign Training</option>
                  <option value="schedule_review">⭐ Schedule Review</option>
                </optgroup>
                <optgroup label="Security">
                  <option value="update_permissions">🔒 Update Permissions</option>
                </optgroup>
                <optgroup label="Integrations">
                  <option value="webhook">🔗 Call Webhook</option>
                </optgroup>
              </select>
            </div>
            
            {/* Email-specific configuration */}
            {(node.data?.actionType === "send_email" || node.data?.actionType === "send_manager_reminder") && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1">Email Subject</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={node.data?.config?.subject || ""}
                    onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), subject: e.target.value } })}
                    placeholder="e.g., Welcome to the team!"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Email Body</label>
                  <textarea
                    className="w-full rounded-xl border px-3 py-2 text-sm min-h-[100px]"
                    value={node.data?.config?.body || ""}
                    onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), body: e.target.value } })}
                    placeholder="Hi {{firstName}},\n\nWelcome to {{companyName}}! We're excited to have you join us.\n\nYour manager {{managerName}} will reach out soon to schedule your first meeting.\n\nBest regards,\n{{ceoName}}"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Send To</label>
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={node.data?.config?.to || "employee"}
                    onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), to: e.target.value } })}
                  >
                    <option value="employee">Employee (trigger subject)</option>
                    <option value="manager">Employee's Manager</option>
                    <option value="hr">HR Team</option>
                    <option value="ceo">CEO</option>
                    <option value="custom">Custom Email Address</option>
                  </select>
                </div>
                {node.data?.config?.to === "custom" && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Email Address</label>
                    <input
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={node.data?.config?.emailAddress || ""}
                      onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), emailAddress: e.target.value } })}
                      placeholder="e.g., hr@company.com"
                    />
                  </div>
                )}
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
                  💡 <strong>Variables:</strong> Use {`{{firstName}}`}, {`{{lastName}}`}, {`{{companyName}}`}, {`{{managerName}}`}, {`{{ceoName}}`} to personalize emails
                </div>
              </>
            )}
            
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
              {actionTypes.find(a => a.id === (node.data?.actionType || "send_email"))?.description || "Configure action details"}
            </div>
          </>
        )}
        {node.type === "condition" && (
          <ConditionNodeFields 
            node={node} 
            onUpdate={onUpdate}
          />
        )}
        {node.type === "delay" && (
          <div>
            <label className="block text-xs font-medium mb-1">Delay Duration (days)</label>
            <input
              type="number"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={node.data?.config?.days || 1}
              onChange={(e) => onUpdate({ config: { ...(node.data?.config || {}), days: parseInt(e.target.value) || 1 } })}
              min="0"
              max="365"
            />
          </div>
        )}
      </div>
      <div className="pt-3 border-t text-[10px] text-muted-foreground">
        Node ID: {node.id}
      </div>
    </div>
  );
}

// Dynamic condition fields component
function ConditionNodeFields({ node, onUpdate }: { node: any; onUpdate: (updates: any) => void }) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentConditionType = node.data?.conditionType || "employee_department";
  const conditionConfig = conditionTypes.find(c => c.id === currentConditionType);
  const conditionData = node.data?.conditionData || {};

  // Load data for multiselect fields
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [deptRes, roleRes, managerRes, locationRes, formRes] = await Promise.all([
          fetch("/api/departments").then(r => r.ok ? r.json() : []),
          fetch("/api/job-roles").then(r => r.ok ? r.json() : []),
          fetch("/api/employees?role=MANAGER").then(r => r.ok ? r.json() : []),
          fetch("/api/locations").then(r => r.ok ? r.json() : []),
          fetch("/api/forms").then(r => r.ok ? r.json() : [])
        ]);

        setDepartments(Array.isArray(deptRes) ? deptRes : []);
        setJobRoles(Array.isArray(roleRes) ? roleRes : []);
        setManagers(Array.isArray(managerRes) ? managerRes : []);
        setLocations(Array.isArray(locationRes) ? locationRes : []);
        setForms(Array.isArray(formRes) ? formRes : []);
      } catch (error) {
        console.error("Failed to load condition data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleConditionDataUpdate = (key: string, value: any) => {
    const newConditionData = { ...conditionData, [key]: value };
    onUpdate({ conditionData: newConditionData });
  };

  const renderField = (field: any) => {
    const value = conditionData[field.key] || "";
    
    switch (field.type) {
      case "select":
        return (
          <select
            key={field.key}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={value}
            onChange={(e) => handleConditionDataUpdate(field.key, e.target.value)}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "multiselect":
        let options: any[] = [];
        if (field.key === "departmentIds") options = departments.map(d => ({ value: d.id, label: d.name }));
        else if (field.key === "jobRoleIds") options = jobRoles.map(r => ({ value: r.id, label: r.name }));
        else if (field.key === "managerIds") options = managers.map(m => ({ value: m.id, label: `${m.firstName} ${m.lastName}` }));
        else if (field.key === "locationIds") options = locations.map(l => ({ value: l.id, label: l.name }));
        else if (field.key === "formId") options = forms.map(f => ({ value: f.id, label: f.name }));
        else if (field.options) options = field.options;

        return (
          <MultiSelect
            key={field.key}
            options={options}
            selected={Array.isArray(value) ? value : []}
            onChange={(selected) => handleConditionDataUpdate(field.key, selected)}
            placeholder={`Select ${field.label}...`}
            disabled={loading}
          />
        );

      case "number":
        return (
          <input
            key={field.key}
            type="number"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={value}
            onChange={(e) => handleConditionDataUpdate(field.key, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );

      case "text":
        return (
          <input
            key={field.key}
            type="text"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={value}
            onChange={(e) => handleConditionDataUpdate(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      default:
        return null;
    }
  };

  const shouldShowField = (field: any) => {
    if (!field.conditional) return true;
    
    const [conditionKey, conditionValue] = field.conditional.split("=");
    const currentValue = conditionData[conditionKey];
    
    if (field.conditional.includes("!=")) {
      const [key, value] = field.conditional.split("!=");
      return currentValue !== value;
    }
    
    return currentValue === conditionValue;
  };

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1">Condition Type</label>
        <select
          className="w-full rounded-xl border px-3 py-2 text-sm"
          value={currentConditionType}
          onChange={(e) => onUpdate({ conditionType: e.target.value, conditionData: {} })}
        >
          <optgroup label="Employee Filters">
            <option value="employee_department">🏢 Filter by Department</option>
            <option value="employee_job_role">💼 Filter by Job Role</option>
            <option value="employee_location">📍 Filter by Location</option>
            <option value="employee_manager">👤 Filter by Manager</option>
            <option value="employee_contract_type">📄 Filter by Contract Type</option>
          </optgroup>
          <optgroup label="Time Filters">
            <option value="time_of_year">📅 Filter by Time of Year</option>
            <option value="days_since_start">⏱️ Days Since Start</option>
            <option value="probation_status">🔍 Probation Status</option>
          </optgroup>
          <optgroup label="Data Conditions">
            <option value="field_value">🔢 Check Field Value</option>
            <option value="has_manager">👥 Has Manager Assigned</option>
          </optgroup>
          <optgroup label="Documents & Forms">
            <option value="document_status">📋 Document Status</option>
            <option value="form_submitted">📝 Form Submission</option>
            <option value="leave_balance">🏖️ Leave Balance</option>
          </optgroup>
          <optgroup label="Advanced">
            <option value="working_hours">🕐 Working Hours</option>
            <option value="custom_field">⚙️ Custom Field Check</option>
          </optgroup>
        </select>
      </div>

      {conditionConfig && (
        <>
          <div className="text-xs text-muted-foreground bg-amber-50 p-2 rounded-lg">
            {conditionConfig.description}
          </div>
          
          {conditionConfig.fields?.map((field) => (
            shouldShowField(field) && (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">
                  {field.label}
                  {'required' in field && field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {'helpText' in field && field.helpText && (
                  <p className="text-xs text-muted-foreground mb-1">{field.helpText}</p>
                )}
                {renderField(field)}
              </div>
            )
          ))}
        </>
      )}
    </>
  );
}


