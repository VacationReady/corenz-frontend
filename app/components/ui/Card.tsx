import React from "react";



<<<<<<<
import clsx from "clsx";

=======
export function Card({

  title,

  icon,

  action,

  children,

  className,

}: {

  title?: React.ReactNode;

  icon?: React.ReactNode;

  action?: React.ReactNode;

  children: React.ReactNode;

  className?: string;

}) {

  return (

    <div

      className={clsx(

        "bg-card rounded-xl shadow-lg border border-enhanced h-full transition-smooth hover-lift",

        className

      )}

    >

      {(title || action) && (

        <div className="bg-card-header border-b border-enhanced px-6 py-4 rounded-t-xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center text-primary">

              {icon && <div className="w-5 h-5 mr-3">{icon}</div>}

              <h2 className="text-lg font-bold text-foreground">{title}</h2>

            </div>

            {action && <div>{action}</div>}

          </div>

        </div>

      )}

      <div className="p-6">

        <div className="text-sm text-foreground space-y-3 leading-relaxed">

          {children}

        </div>

      </div>

    </div>

  );

}

>>>>>>>


<<<<<<<


=======
export function CardContent({

  children,

  className,

}: {

  children: React.ReactNode;

  className?: string;

}) {

  return <div className={clsx("space-y-3", className)}>{children}</div>;

}

>>>>>>>


<<<<<<<
export function Card({

=======
export function CardHeader({

  children,

  className

}: {

  children: React.ReactNode;

  className?: string;

}) {

  return (

    <div className={clsx("bg-card-header border-b border-enhanced px-6 py-4 rounded-t-xl", className)}>

      {children}

    </div>

  );

}

>>>>>>>


<<<<<<<
  title,



  icon,



  action,



  children,



  className,



}: {



  title?: React.ReactNode;



  icon?: React.ReactNode;



  action?: React.ReactNode;



  children: React.ReactNode;



  className?: string;



}) {



  return (



    <div



      className={clsx(



        "bg-white dark:bg-surface-dark rounded-2xl shadow-sm p-6 h-full transition-transform duration-200 hover:scale-[1.02]",



        className



      )}



    >



      {(title || action) && (



        <div className="flex items-center justify-between mb-4">



          <div className="flex items-center text-primary">



            {icon && <div className="w-6 h-6 mr-2">{icon}</div>}



            <h2 className="text-lg font-semibold">{title}</h2>



          </div>



          {action && <div>{action}</div>}



        </div>



      )}



      <div className="text-sm text-gray-800 dark:text-gray-200 space-y-2">



        {children}



      </div>



    </div>



  );



}







export function CardContent({



  children,



  className,



}: {



  children: React.ReactNode;



  className?: string;



}) {



  return <div className={clsx("pt-2", className)}>{children}</div>;



}







export function CardHeader({ children }: { children: React.ReactNode }) {



  return <div className="border-b p-4">{children}</div>;



}







export function CardTitle({ children }: { children: React.ReactNode }) {



  return <h2 className="text-lg font-semibold">{children}</h2>;



}



=======
export function CardTitle({

  children,

  className

}: {

  children: React.ReactNode;

  className?: string;

}) {

  return (

    <h2 className={clsx("text-lg font-bold text-foreground", className)}>

      {children}

    </h2>

  );

}



export function CardFooter({

  children,

  className,

}: {

  children: React.ReactNode;

  className?: string;

}) {

  return (

    <div className={clsx("border-t border-enhanced px-6 py-4 bg-card-header rounded-b-xl", className)}>

      {children}

    </div>

  );

}

>>>>>>>
