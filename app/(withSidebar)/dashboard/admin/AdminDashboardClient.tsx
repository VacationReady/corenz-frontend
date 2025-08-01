"use client";







import { useState } from "react";



import { DashboardWidget } from "@/components/ui/DashboardWidget";



import {



<<<<<<<
  Megaphone,

=======
  return (

    <>

      {/* Quick Actions */}

      <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">

        <div className="grid grid-cols-2 gap-3">

          {actions.map(({ label, icon: Icon }) => (

            <button

              key={label}

              onClick={() => {

                if (label === "Add Employee") setModalOpen(true);

                if (label === "Add Document") setAddDocumentOpen(true);

              }}

              className="flex flex-col items-center justify-center bg-section-background border border-enhanced rounded-lg p-4 hover:bg-accent hover:shadow-sm transition-smooth hover-lift group"

            >

              <Icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-smooth" />

              <span className="text-sm font-medium text-foreground">{label}</span>

            </button>

          ))}

        </div>

      </DashboardWidget>

>>>>>>>


<<<<<<<
  FileText,

=======
      {/* People Metrics */}

      <DashboardWidget title="People Metrics" icon={Users} className="h-full">

        <div className="space-y-4">

          <div className="flex justify-between items-center">

            <span className="text-muted-foreground">Active Employees</span>

            <span className="text-2xl font-bold text-foreground">46</span>

          </div>

          <div className="flex justify-between items-center">

            <span className="text-muted-foreground">Managers</span>

            <span className="text-2xl font-bold text-foreground">5</span>

          </div>

          <div className="flex justify-between items-center">

            <span className="text-muted-foreground">New Starters This Month</span>

            <span className="text-2xl font-bold text-primary">3</span>

          </div>

        </div>

      </DashboardWidget>

>>>>>>>


<<<<<<<
  Mail,

=======
      {/* Pending Approvals */}

      <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">

        <div className="text-center">

          <p className="text-5xl font-bold text-primary mb-2">7</p>

          <p className="text-muted-foreground">Awaiting your approval</p>

          <div className="mt-4 pt-4 border-t border-enhanced">

            <button className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth">

              View All →

            </button>

          </div>

        </div>

      </DashboardWidget>

>>>>>>>


<<<<<<<
  Users,

=======
      {/* Who's Off */}

      <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">

        <div className="text-center py-4">

          <p className="text-muted-foreground mb-4">Loading leave data...</p>

          <div className="animate-pulse space-y-2">

            <div className="h-3 bg-muted rounded w-3/4 mx-auto"></div>

            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>

          </div>

        </div>

      </DashboardWidget>

>>>>>>>


  ClipboardList,



  CalendarCheck2,



  UserPlus,



} from "lucide-react";



import { NewsWidget } from "@/components/dashboard/NewsWidget";



import AddEmployeeModal from "@/components/employees/AddEmployeeModal";



import AddDocumentModal from "@/components/documents/AddDocumentModal";







interface AdminDashboardClientProps {



  employeeId: string;



  firstName: string;



}







export default function AdminDashboardClient({



  employeeId,



  firstName,



}: AdminDashboardClientProps) {



  const [modalOpen, setModalOpen] = useState(false);



  const [addDocumentOpen, setAddDocumentOpen] = useState(false);







  const actions = [



    { label: "Post News", icon: FileText },



    { label: "Add Employee", icon: UserPlus },



    { label: "Add Document", icon: FileText },



    { label: "Email Employee", icon: Mail },



  ];







  return (



    <>



      {/* Quick Actions */}



      <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">



        <div className="grid grid-cols-2 gap-2">



          {actions.map(({ label, icon: Icon }) => (



            <button



              key={label}



              onClick={() => {



                if (label === "Add Employee") setModalOpen(true);



                if (label === "Add Document") setAddDocumentOpen(true);



              }}



              className="flex flex-col items-center justify-center bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 hover:shadow-md hover:scale-105 transition-transform"



            >



              <Icon className="w-5 h-5 text-indigo-600 mb-1" />



              <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>



            </button>



          ))}



        </div>



      </DashboardWidget>







      {/* People Metrics */}



      <DashboardWidget title="People Metrics" icon={Users} className="h-full">



        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">



          <li>



            Active Employees: <span className="font-semibold">46</span>



          </li>



          <li>



            Managers: <span className="font-semibold">5</span>



          </li>



          <li>



            New Starters This Month: <span className="font-semibold">3</span>



          </li>



        </ul>



      </DashboardWidget>







      {/* Pending Approvals */}



      <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">



        <p className="text-4xl font-bold text-indigo-700 dark:text-indigo-300">7</p>



        <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>



      </DashboardWidget>







      {/* Who's Off */}



      <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">



        <p className="text-sm text-gray-600 dark:text-gray-300">Loading leave data...</p>



      </DashboardWidget>







      <NewsWidget />







      {/* Add Employee Modal */}



      <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />







      {/* Add Document Modal */}



      <AddDocumentModal open={addDocumentOpen} onClose={() => setAddDocumentOpen(false)} />



    </>



  );



}



