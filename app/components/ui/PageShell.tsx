<<<<<<<
import React from "react";

=======
import React from "react";

import clsx from "clsx";

>>>>>>>


<<<<<<<




export function PageShell({



  title,



  description,



  icon,



  children,



  className,



  action,



}: {



  title: string;



  description?: string;



  icon?: React.ReactNode;



  children: React.ReactNode;



  className?: string;



  action?: React.ReactNode;



}) {



  return (



    <div className={`w-full p-6 ${className || ""}`}>



      <div className="flex items-center justify-between mb-6">



        <div>



          <div className="flex items-center text-indigo-700">



            {icon && <div className="w-5 h-5 mr-2">{icon}</div>}



            <h1 className="text-2xl font-bold">{title}</h1>



          </div>



          {description && (



            <p className="text-sm text-muted-foreground mt-1">{description}</p>



          )}



        </div>



        {action}



      </div>



      {children}



    </div>



  );



=======
export function PageShell({

  title,

  description,

  icon,

  children,

  className,

  action,

}: {

  title: string;

  description?: string;

  icon?: React.ReactNode;

  children: React.ReactNode;

  className?: string;

  action?: React.ReactNode;

}) {

  return (

    <div className={clsx("w-full min-h-screen bg-content-panel", className)}>

      {/* Sticky Header */}

      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">

        <div className="px-8 py-6">

          <div className="flex items-center justify-between">

            <div>

              <div className="flex items-center text-primary mb-2">

                {icon && <div className="w-6 h-6 mr-3">{icon}</div>}

                <h1 className="text-3xl font-bold text-foreground">{title}</h1>

              </div>

              {description && (

                <p className="text-muted-foreground text-base leading-relaxed">{description}</p>

              )}

            </div>

            {action && <div className="flex-shrink-0">{action}</div>}

          </div>

        </div>

      </div>



      {/* Content Area */}

      <div className="px-8 py-6">

        {children}

      </div>

    </div>

  );

>>>>>>>
}
