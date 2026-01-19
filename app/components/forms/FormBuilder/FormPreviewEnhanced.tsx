"use client";

import { FormField } from "@/api/forms/[id]/types";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { evaluate } from "mathjs";
import { MoodIcon } from "@/components/ui/MoodIconPicker";

export function FormPreviewEnhanced({ fields }: { fields: FormField[] }) {
  const [fieldValues, setFieldValues] = useState<Record<string, number>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleValueChange = (fieldId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFieldValues(prev => ({ ...prev, [fieldId]: numValue }));
  };

  const calculateFieldValue = (field: FormField): string => {
    if (!field.calculationConfig?.expression && !field.calculation) return "";
    
    const expression = field.calculationConfig?.expression || field.calculation || "";
    let result = expression;
    
    fields.forEach(f => {
      if (fieldValues[f.id] !== undefined) {
        result = result.replace(new RegExp(f.id, 'g'), fieldValues[f.id].toString());
      }
    });
    
    try {
      const sanitized = result.replace(/[^0-9+\-*/.() ]/g, '');
      if (sanitized && /^[0-9+\-*/.() ]+$/.test(sanitized)) {
        const evaluated = evaluate(sanitized);
        const precision = field.calculationConfig?.precision ?? 2;
        const format = field.calculationConfig?.format || "number";
        
        if (format === "currency") {
          return `$${evaluated.toFixed(precision)}`;
        } else if (format === "percentage") {
          return `${evaluated.toFixed(precision)}%`;
        } else {
          return evaluated.toFixed(precision);
        }
      }
    } catch (e) {
      return "Error";
    }
    
    return "—";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="glass-subtle rounded-2xl p-6 border border-white/30">
      {fields.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-muted-foreground py-16"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner">
            <AlertCircle className="h-10 w-10 opacity-40" />
          </div>
          <p className="font-semibold text-lg mb-1">No fields yet</p>
          <p className="text-sm opacity-70">
            Add fields in the Build step to see the preview
          </p>
        </motion.div>
      ) : (
        <motion.form 
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {fields.map((field, index) => (
            <motion.div 
              key={field.id} 
              variants={itemVariants}
              className="relative"
            >
              {/* Structural elements */}
              {field.type === "sectionHeader" && (
                <div className="pt-4 pb-2">
                  <h4 className="text-xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {field.label || "Section"}
                  </h4>
                  <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-2" />
                </div>
              )}
              {field.type === "description" && (
                <div className="py-2 px-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <p className="text-sm text-blue-900/80 leading-relaxed">
                    {field.helpText || field.placeholder || field.label}
                  </p>
                </div>
              )}
              {field.type === "divider" && (
                <div className="py-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
              )}
              {field.type === "pageBreak" && (
                <div className="py-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                  <span className="text-xs uppercase tracking-widest font-semibold text-primary/60 px-3 py-1 rounded-full bg-primary/5">
                    Page Break
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
                </div>
              )}

              {/* Controls */}
              {!["sectionHeader","description","divider","pageBreak"].includes(String(field.type)) && (
                <motion.div
                  className={`
                    relative p-4 rounded-2xl transition-all duration-300
                    ${focusedField === field.id 
                      ? 'bg-white shadow-lg shadow-primary/10 ring-2 ring-primary/20' 
                      : 'bg-white/50 hover:bg-white/70'}
                  `}
                  whileHover={{ scale: 1.005 }}
                >
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {field.label || "Untitled Field"}
                    {field.required && (
                      <span className="text-rose-500 ml-1">*</span>
                    )}
                  </label>
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground mb-3">{field.helpText}</p>
                  )}
                  {renderPreviewField(
                    field, 
                    fieldValues, 
                    handleValueChange, 
                    calculateFieldValue,
                    focusedField,
                    setFocusedField
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}

          {/* Preview save button */}
          <motion.div 
            variants={itemVariants}
            className="pt-6 border-t border-border/50"
          >
            <button
              type="button"
              disabled
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-lg shadow-primary/20 opacity-80 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              Save Changes
            </button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              This screen will appear within the employee&apos;s profile with full audit trail.
            </p>
          </motion.div>
        </motion.form>
      )}
    </div>
  );
}

function renderPreviewField(
  field: FormField,
  fieldValues: Record<string, number>,
  handleValueChange: (fieldId: string, value: string) => void,
  calculateFieldValue: (field: FormField) => string,
  focusedField: string | null,
  setFocusedField: (id: string | null) => void
) {
  const baseInput = `
    w-full rounded-xl bg-white border-2 border-gray-100 px-4 py-3 text-sm 
    transition-all duration-200 placeholder:text-muted-foreground/50
    focus:outline-none focus:ring-0 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/5
    hover:border-gray-200
  `;

  const handleFocus = () => setFocusedField(field.id);
  const handleBlur = () => setFocusedField(null);

  switch (field.type) {
    case "time":
      return (
        <input 
          type="time" 
          className={baseInput} 
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );
    case "dateRange":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Start</span>
            <input 
              type="date" 
              className={baseInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">End</span>
            <input 
              type="date" 
              className={baseInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>
      );
    case "switch":
      return (
        <label className="inline-flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-12 h-7 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:shadow-md after:transition-all peer-checked:bg-primary"></div>
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {field.placeholder || "Toggle"}
          </span>
        </label>
      );
    case "rating":
      return (
        <div className="flex gap-2">
          {Array.from({ length: Math.max(5, Number(field.validation?.max || 5)) }).map((_, i) => (
            <motion.button
              key={i}
              type="button"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`text-2xl transition-colors ${i < Number(field.defaultValue || 0) ? "text-amber-400" : "text-gray-200 hover:text-amber-200"}`}
            >
              ★
            </motion.button>
          ))}
        </div>
      );
    case "slider":
      return (
        <div className="space-y-3">
          <input 
            type="range" 
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
            min={field.validation?.min ?? 0} 
            max={field.validation?.max ?? 100} 
            defaultValue={field.defaultValue ?? 50} 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{field.validation?.min ?? 0}</span>
            <span>{field.validation?.max ?? 100}</span>
          </div>
        </div>
      );
    case "currency":
      return (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <input 
            type="number" 
            inputMode="decimal" 
            className={`${baseInput} pl-8`}
            placeholder={field.placeholder || "0.00"}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>
      );
    case "number":
      return (
        <input 
          type="number" 
          className={baseInput} 
          placeholder={field.placeholder || "0"}
          onChange={(e) => handleValueChange(field.id, e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );
    case "percentage":
      return (
        <div className="relative">
          <input 
            type="number" 
            inputMode="decimal" 
            className={`${baseInput} pr-10`}
            placeholder={field.placeholder || "0"}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
        </div>
      );
    case "address":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={`${baseInput} md:col-span-2`} placeholder="Street address" onFocus={handleFocus} onBlur={handleBlur} />
          <input className={baseInput} placeholder="City" onFocus={handleFocus} onBlur={handleBlur} />
          <input className={baseInput} placeholder="State/Province" onFocus={handleFocus} onBlur={handleBlur} />
          <input className={baseInput} placeholder="Postal code" onFocus={handleFocus} onBlur={handleBlur} />
          <input className={baseInput} placeholder="Country" onFocus={handleFocus} onBlur={handleBlur} />
        </div>
      );
    case "attachmentGallery":
      return (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.02 }}
              className="aspect-square rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <span className="text-2xl text-gray-300">+</span>
            </motion.div>
          ))}
        </div>
      );
    case "signature":
      return (
        <div className="h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center text-muted-foreground hover:border-primary/30 transition-colors cursor-pointer">
          <div className="text-center">
            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
            <span className="text-sm">Click to sign</span>
          </div>
        </div>
      );
    case "text":
    case "email":
    case "phone":
    case "date":
      return (
        <input
          type={field.type}
          className={baseInput}
          placeholder={field.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );

    case "textarea":
      return (
        <textarea
          className={`${baseInput} min-h-[120px] resize-none`}
          placeholder={field.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      );

    case "select": {
      const isMulti = field.multiple !== false && field.multiple !== undefined;
      return (
        <select 
          className={baseInput} 
          defaultValue={isMulti ? undefined : ""}
          multiple={isMulti}
          size={isMulti ? Math.min(4, Math.max(2, (field.options || []).length)) : undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {!isMulti && (
            <option value="" disabled className="text-muted-foreground">
              {field.placeholder || "Select an option"}
            </option>
          )}
          {field.options?.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    case "radio":
      return (
        <div className="flex flex-wrap gap-3 mt-1">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
              <div className="relative">
                <input
                  type="radio"
                  name={String(field.id)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                  <div className="absolute inset-1 rounded-full bg-primary scale-0 peer-checked:scale-100 transition-transform" />
                </div>
              </div>
              <span className="text-sm font-medium group-hover:text-foreground transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col gap-2 mt-1">
          {field.options?.map((opt, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-lg border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-all">
                  <svg className="w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-medium group-hover:text-foreground transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      );

    case "chips":
    case "multiselect":
      const isChipMulti = field.type === "multiselect";
      const appearance = field.appearance || "chips";
      
      return (
        <div className="space-y-3">
          {appearance === "buttons" ? (
            // Card-style layout with icons
            <div className="grid grid-cols-2 gap-3">
              {field.optionItems?.map((item, i) => (
                <label key={i} className="relative cursor-pointer group">
                  <input
                    type={isChipMulti ? "checkbox" : "radio"}
                    name={String(field.id)}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    "peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary",
                    "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}>
                    {item.iconName && (
                      <div className="mb-2 flex justify-center">
                        <MoodIcon name={item.iconName} className="h-8 w-8" />
                      </div>
                    )}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </label>
              ))}
              {(!field.optionItems || field.optionItems.length === 0) && (
                <div className="col-span-2 text-center text-sm text-muted-foreground italic py-8">
                  No options configured
                </div>
              )}
            </div>
          ) : (
            // Chip-style layout with icons
            <div className="flex flex-wrap gap-2">
              {field.optionItems?.map((item, i) => (
                <label key={i} className="cursor-pointer group">
                  <input
                    type={isChipMulti ? "checkbox" : "radio"}
                    name={String(field.id)}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all",
                    "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary",
                    "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}>
                    {item.iconName && (
                      <MoodIcon name={item.iconName} className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </label>
              ))}
              {(!field.optionItems || field.optionItems.length === 0) && (
                <span className="text-sm text-muted-foreground italic">No options configured</span>
              )}
            </div>
          )}
        </div>
      );

    case "file":
      return (
        <motion.label 
          whileHover={{ scale: 1.01 }}
          className="flex flex-col items-center justify-center py-8 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground">Click to upload</span>
          <span className="text-xs text-muted-foreground mt-1">or drag and drop</span>
          <input type="file" className="hidden" />
        </motion.label>
      );
    
    case "table":
      if (!field.tableColumns || field.tableColumns.length === 0) {
        return (
          <div className="text-muted-foreground italic text-sm bg-gray-50 border border-dashed rounded-xl p-4">
            No columns configured for this table
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {field.tableColumns.map((col) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {col.label}
                      {col.required && <span className="text-rose-500 ml-1">*</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50 transition-colors">
                  {field.tableColumns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {col.type === "select" ? (
                        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-primary/50 focus:outline-none transition-colors">
                          <option value="">Select...</option>
                          {col.options?.map((opt, i) => (
                            <option key={i} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={col.type}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary/50 focus:outline-none transition-colors"
                          placeholder={col.type === "date" ? "YYYY-MM-DD" : "..."}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
          >
            <span className="text-lg">+</span> Add Row
          </button>
        </div>
      );
    
    case "list":
      return (
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              className={`${baseInput} flex-1`}
              placeholder="List item 1"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <button type="button" className="px-3 text-gray-400 hover:text-rose-500 transition-colors">✕</button>
          </div>
          <button type="button" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors">
            <span className="text-lg">+</span> Add Item
          </button>
        </div>
      );
    
    case "computed":
    case "readOnly":
      const calculatedValue = calculateFieldValue(field);
      return (
        <div className="relative">
          <input
            type="text"
            disabled
            className={`${baseInput} bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 font-semibold text-foreground cursor-not-allowed`}
            placeholder={field.placeholder || "Auto-calculated"}
            value={calculatedValue || "—"}
          />
          {calculatedValue && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 right-2 bg-gradient-to-r from-primary to-primary/80 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm"
            >
              Live
            </motion.div>
          )}
        </div>
      );

    default:
      return null;
  }
}

