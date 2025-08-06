<<<<<<<
export interface FormField {



  id: string;



  type: string;



  label: string;



  placeholder?: string;



  required: boolean;



  options?: string[];



}



=======
export interface FormField {

  id: string;

  type: string;

  label: string;

  placeholder?: string;

  required: boolean;

  options?: string[];

  // New properties for enhanced fields

  allowMultiple?: boolean; // For table/list fields

  tableColumns?: TableColumn[]; // For table fields

  maxEntries?: number; // Maximum number of entries for table fields

  calculation?: string; // For calculated fields

}



export interface TableColumn {

  id: string;

  label: string;

  type: 'text' | 'number' | 'date' | 'select';

  options?: string[]; // For select columns

  required?: boolean;

}

>>>>>>>
