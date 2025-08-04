'use client';



<<<<<<<


=======
import { useState } from 'react';

import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

import { v4 as uuidv4 } from 'uuid';

import { FieldPalette } from './FieldPalette';

import { FormCanvas } from './FormCanvas';

import { FieldEditor } from './FieldEditor';

import { FormPreview } from './FormPreview';

import { VisibilitySettings } from './VisibilitySettings';

import Button from '@/components/ui/Button';

import { Input } from '@/components/ui/Input';

import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';

import { FormField } from './types';

>>>>>>>


<<<<<<<
import { useState } from 'react';

=======
interface FormBuilderProps {

  onSave: (data: {

    name: string;

    description?: string;

    schema: FormField[];

    visibleToRoles?: string[];

    visibleToDepartments?: string[];

    visibleToJobRoles?: string[];

  }) => void;

  initialData?: {

    name: string;

    description?: string;

    schema: FormField[];

    visibleToRoles?: string[];

    visibleToDepartments?: string[];

    visibleToJobRoles?: string[];

  };

}

>>>>>>>


<<<<<<<
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

=======
export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {

  const [fields, setFields] = useState<FormField[]>(initialData?.schema || []);

  const [selectedField, setSelectedField] = useState<FormField | null>(null);

  const [activeDragField, setActiveDragField] = useState<FormField | null>(null);

  const [formName, setFormName] = useState(initialData?.name || 'New Form');

  const [formDescription, setFormDescription] = useState(initialData?.description || '');

  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(initialData?.visibleToRoles || ['ADMIN', 'MANAGER', 'EMPLOYEE']);

  const [visibleToDepartments, setVisibleToDepartments] = useState<string[]>(initialData?.visibleToDepartments || []);

  const [visibleToJobRoles, setVisibleToJobRoles] = useState<string[]>(initialData?.visibleToJobRoles || []);

>>>>>>>


import { v4 as uuidv4 } from 'uuid';



<<<<<<<
import { FieldPalette } from './FieldPalette';

=======
  // Save form schema to parent handler

  const saveForm = () => {

    if (!formName.trim()) return toast.error('Form name is required');

    if (!fields.length) return toast.error('Add at least one field before saving');

    const unnamed = fields.some((f) => !f.label.trim());

    if (unnamed) return toast.error('All fields must have labels');

    if (!visibleToRoles.length) return toast.error('At least one role must be selected for visibility');

>>>>>>>


<<<<<<<
import { FormCanvas } from './FormCanvas';

=======
    onSave({

      name: formName,

      description: formDescription,

      schema: fields,

      visibleToRoles,

      visibleToDepartments,

      visibleToJobRoles,

    });

    toast.success('Form saved successfully');

  };

>>>>>>>


<<<<<<<
import { FieldEditor } from './FieldEditor';

=======
  return (

    <div className="flex flex-col gap-4">

      {/* Form Metadata */}

      <div className="bg-white border rounded-lg p-4 shadow-sm">

        <h3 className="font-semibold mb-3 text-lg">Form Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">

              Form Name <span className="text-red-500">*</span>

            </label>

            <Input

              value={formName}

              onChange={(e) => setFormName(e.target.value)}

              placeholder="Enter form name"

              className={!formName.trim() ? 'border-red-500 focus:ring-red-500' : ''}

            />

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">

              Description

            </label>

            <Textarea

              value={formDescription}

              onChange={(e) => setFormDescription(e.target.value)}

              placeholder="Optional form description"

              className="min-h-[80px]"

            />

          </div>

        </div>

      </div>



      {/* Visibility Settings */}

      <VisibilitySettings

        visibleToRoles={visibleToRoles}

        visibleToDepartments={visibleToDepartments}

        visibleToJobRoles={visibleToJobRoles}

        onChange={(visibility) => {

          setVisibleToRoles(visibility.visibleToRoles);

          setVisibleToDepartments(visibility.visibleToDepartments);

          setVisibleToJobRoles(visibility.visibleToJobRoles);

        }}

      />



      <DndContext

        onDragEnd={handleDragEnd}

        onDragStart={(e) =>

          setActiveDragField({

            id: 'temp',

            type: String(e.active.id),

            label: String(e.active.id), // ✅ FIXED TYPE ERROR (explicit cast)

            required: false,

          })

        }

      >

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Field Palette */}

          <FieldPalette />

>>>>>>>


import { FormPreview } from './FormPreview';



import Button from '@/components/ui/Button';



import { toast } from 'sonner';



import { FormField } from './types';



<<<<<<<




interface FormBuilderProps {



  onSave: (data: { name: string; description?: string; schema: FormField[] }) => void;



}







export default function FormBuilder({ onSave }: FormBuilderProps) {



  const [fields, setFields] = useState<FormField[]>([]);



  const [selectedField, setSelectedField] = useState<FormField | null>(null);



  const [activeDragField, setActiveDragField] = useState<FormField | null>(null);







  // Handle drag from palette to canvas



  const handleDragEnd = (event: DragEndEvent) => {



    setActiveDragField(null);



    if (event.over?.id === 'canvas') {



      const newField: FormField = {



        id: uuidv4(),



        type: String(event.active.id),



        label: 'Untitled Field',



        required: false,



      };



      setFields((prev) => [...prev, newField]);



      toast.success(`Added ${newField.type} field`);



    }



  };







  // Save form schema to parent handler



  const saveForm = () => {



    if (!fields.length) return toast.error('Add at least one field before saving');



    const unnamed = fields.some((f) => !f.label.trim());



    if (unnamed) return toast.error('All fields must have labels');







    onSave({



      name: 'New Form',



      description: 'Generated from FormBuilder',



      schema: fields,



    });



    toast.success('Form saved successfully');



  };







  return (



    <div className="flex flex-col gap-4">



      <DndContext



        onDragEnd={handleDragEnd}



        onDragStart={(e) =>



          setActiveDragField({



            id: 'temp',



            type: String(e.active.id),



            label: String(e.active.id), // ✅ FIXED TYPE ERROR (explicit cast)



            required: false,



          })



        }



      >



        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">



          {/* Field Palette */}



          <FieldPalette />







          {/* Canvas */}



          <FormCanvas



            fields={fields}



            setFields={setFields}



            onSelectField={(field) => setSelectedField(field)}



          />







          {/* Field Editor */}



          <div>



            {selectedField ? (



              <FieldEditor



                field={selectedField}



                onChange={(updated) =>



                  setFields((prev) =>



                    prev.map((f) => (f.id === updated.id ? updated : f))



                  )



                }



              />



            ) : (



              <p className="text-gray-500 italic mt-4">Select a field to edit its properties</p>



            )}



          </div>







          {/* Live Preview */}



          <FormPreview fields={fields} />



        </div>







        {/* Drag Overlay Preview */}



        <DragOverlay>



          {activeDragField ? (



            <div className="p-2 px-3 bg-white border rounded shadow text-sm font-medium shadow-lg">



              {activeDragField.label}



            </div>



          ) : null}



        </DragOverlay>



      </DndContext>







      {/* Save Button */}



      <Button



        onClick={saveForm}



        className="self-end mt-4"



        disabled={!fields.length} // UX: Disable until at least one field added



      >



        Save Form



      </Button>



    </div>



  );



}



=======
      {/* Save Button */}

      <Button

        onClick={saveForm}

        className="self-end mt-4"

        disabled={!formName.trim() || !fields.length || !visibleToRoles.length} // UX: Disable until name, fields, and visibility added

      >

        Save Form

      </Button>

    </div>

  );

}

>>>>>>>
