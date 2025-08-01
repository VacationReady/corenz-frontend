"use client";







<<<<<<<
import * as React from "react";

=======
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(

  ({ className, type, ...props }, ref) => {

    return (

      <input

        type={type}

        className={cn(

          "flex h-10 w-full rounded-md border border-enhanced bg-card px-3 py-2.5 text-sm transition-smooth placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",

          className

        )}

        ref={ref}

        {...props}

      />

    );

  }

);

Input.displayName = "Input";

>>>>>>>


import { cn } from "@/lib/utils";







const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(



  ({ className, type, ...props }, ref) => {



    return (



      <input



        type={type}



        className={cn(



          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",



          className



        )}



        ref={ref}



        {...props}



      />



    );



  }



);



Input.displayName = "Input";







export { Input };



