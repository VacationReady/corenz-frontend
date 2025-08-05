'use client';



import { useDroppable } from '@dnd-kit/core';



import { PlusCircle, GripVertical, Pencil } from 'lucide-react';



import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';



import { FormField } from './types';



<<<<<<<




export function FormCanvas({



  fields,



  onSelectField,



  setFields,



  selectedField,



}: {



  fields: FormField[];



  onSelectField: (field: FormField) => void;



  setFields: React.Dispatch<React.SetStateAction<FormField[]>>;



  selectedField: FormField | null;



}) {



  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' });



  return (



    <TooltipProvider>



      <div



        ref={setNodeRef}



        className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors ${



          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'



        }`}



      >



        <h3 className="text-lg font-semibold mb-3">Form Fields</h3>



        {fields.length === 0 ? (



          <div className="flex flex-col items-center justify-center text-gray-400 py-12">



            <PlusCircle className="h-8 w-8 mb-2 opacity-60" />



            <p className="italic text-sm">Drag fields here from the palette</p>



          </div>



        ) : (



          <div className="space-y-3">



            {fields.map((field) => (



              <Tooltip key={field.id}>



                <TooltipTrigger asChild>



                  <div



                    tabIndex={0}



                    onClick={() => onSelectField(field)}



                    className={`group flex items-center justify-between border p-3 rounded-md cursor-pointer focus:outline-none transition ${



                      selectedField?.id === field.id



                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400'



                        : 'bg-white hover:bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-400'



                    }`}



                  >



                    <div className="flex flex-col">



                      <span className="font-medium">



                        {field.label || <span className="text-gray-400 italic">Click to add label</span>}



                      </span>



                      <span className="text-xs text-gray-500">



                        {field.type} {field.required && '• Required'}



                      </span>



                    </div>



                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">



                      <Tooltip>



                        <TooltipTrigger asChild>



                          <Pencil className="h-4 w-4 text-gray-400 cursor-pointer" />



                        </TooltipTrigger>



                        <TooltipContent>Edit Field</TooltipContent>



                      </Tooltip>



                      <Tooltip>



                        <TooltipTrigger asChild>



                          <GripVertical className="h-4 w-4 text-gray-400 cursor-pointer" />



                        </TooltipTrigger>



                        <TooltipContent>Reorder</TooltipContent>



                      </Tooltip>



                    </div>



                  </div>



                </TooltipTrigger>



                <TooltipContent side="right">Click to edit this field’s settings</TooltipContent>



              </Tooltip>



            ))}



          </div>



        )}



      </div>



    </TooltipProvider>



  );



}



=======
  const handleDeleteField = (fieldId: string) => {

    setFields((prev) => prev.filter((f) => f.id !== fieldId));

    // Clear selection if deleted field was selected

    if (selectedField?.id === fieldId) {

      const remainingFields = fields.filter((f) => f.id !== fieldId);

      onSelectField(remainingFields[0] || null);

    }

  };



  return (

    <TooltipProvider>

      <div

        ref={setNodeRef}

        className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 transition-colors ${

          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'

        }`}

      >

        <h3 className="text-lg font-semibold mb-3">Form Fields</h3>

        {fields.length === 0 ? (

          <div className="flex flex-col items-center justify-center text-gray-400 py-12">

            <PlusCircle className="h-8 w-8 mb-2 opacity-60" />

            <p className="italic text-sm">Drag fields here from the palette</p>

          </div>

        ) : (

          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>

            <div className="space-y-3">

              {fields.map((field) => (

                <SortableFieldItem

                  key={field.id}

                  field={field}

                  selectedField={selectedField}

                  onSelectField={onSelectField}

                  onDeleteField={handleDeleteField}

                />

              ))}

            </div>

          </SortableContext>

        )}

      </div>

    </TooltipProvider>

  );

}

>>>>>>>
