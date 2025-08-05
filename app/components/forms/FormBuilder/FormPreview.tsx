'use client';







import { FormField } from './types';



import { AlertCircle } from 'lucide-react';



<<<<<<<




export function FormPreview({ fields }: { fields: FormField[] }) {



  return (



    <div className="border p-4 rounded-lg bg-gray-50 shadow-sm">



      <h3 className="font-semibold mb-4 text-lg">Preview</h3>



      {fields.length === 0 ? (



        <div className="flex flex-col items-center text-gray-400 py-12">



          <AlertCircle className="h-8 w-8 mb-2 opacity-60" />



          <p className="italic text-sm">No fields yet. Start building your form.</p>



        </div>



      ) : (



        <form className="space-y-5">



          {fields.map((field) => (



            <div key={field.id} className="flex flex-col gap-1">



              <label className="block text-sm font-medium text-gray-700">



                {field.label || 'Untitled Field'}



                {field.required && <span className="text-red-500 ml-1">*</span>}



              </label>



              {renderPreviewField(field)}



            </div>



          ))}



        </form>



      )}



    </div>



  );



}







function renderPreviewField(field: FormField) {



  const baseInput =



    'border rounded w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition';







  switch (field.type) {



    case 'text':



    case 'email':



    case 'phone':



    case 'date':



      return <input type={field.type} className={baseInput} placeholder={field.placeholder} />;



    case 'textarea':



      return <textarea className={`${baseInput} min-h-[80px]`} placeholder={field.placeholder} />;



    case 'select':



      return (



        <select className={baseInput} defaultValue="">



          <option value="" disabled>



            {field.placeholder || 'Select an option'}



          </option>



          {field.options?.map((opt, i) => (



            <option key={i} value={opt}>



              {opt}



            </option>



          ))}



        </select>



      );



    case 'radio':



      return (



        <div className="flex flex-wrap gap-4 mt-1">



          {field.options?.map((opt, i) => (



            <label key={i} className="flex items-center gap-2 cursor-pointer">



              <input



                type="radio"



                name={String(field.id)}



                className="accent-blue-500 focus:ring-blue-400"



              />



              <span className="text-sm">{opt}</span>



            </label>



          ))}



        </div>



      );



    case 'checkbox':



      return (



        <div className="flex flex-col gap-2 mt-1">



          {field.options?.map((opt, i) => (



            <label key={i} className="flex items-center gap-2 cursor-pointer">



              <input type="checkbox" className="accent-blue-500 focus:ring-blue-400" />



              <span className="text-sm">{opt}</span>



            </label>



          ))}



        </div>



      );



    default:



      return null;



  }



}



=======
  switch (field.type) {

    case 'text':

    case 'email':

    case 'phone':

    case 'date':

      return <input type={field.type} className={baseInput} placeholder={field.placeholder} />;

    case 'textarea':

      return <textarea className={`${baseInput} min-h-[80px]`} placeholder={field.placeholder} />;

    case 'select':

      return (

        <select className={baseInput} defaultValue="">

          <option value="" disabled>

            {field.placeholder || 'Select an option'}

          </option>

          {field.options?.map((opt, i) => (

            <option key={i} value={opt}>

              {opt}

            </option>

          ))}

        </select>

      );

    case 'radio':

      return (

        <div className="flex flex-wrap gap-4 mt-1">

          {field.options?.map((opt, i) => (

            <label key={i} className="flex items-center gap-2 cursor-pointer">

              <input

                type="radio"

                name={String(field.id)}

                className="accent-blue-500 focus:ring-blue-400"

              />

              <span className="text-sm">{opt}</span>

            </label>

          ))}

        </div>

      );

    case 'checkbox':

      return (

        <div className="flex flex-col gap-2 mt-1">

          {field.options?.map((opt, i) => (

            <label key={i} className="flex items-center gap-2 cursor-pointer">

              <input type="checkbox" className="accent-blue-500 focus:ring-blue-400" />

              <span className="text-sm">{opt}</span>

            </label>

          ))}

        </div>

      );

    case 'file':

      return (

        <input

          type="file"

          className={`${baseInput} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`}

        />

      );

    default:

      return null;

  }

}

>>>>>>>
