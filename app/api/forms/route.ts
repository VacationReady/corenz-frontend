import { NextResponse } from "next/server";



import { getServerSession } from "next-auth";



import { authOptions } from "@/lib/auth-options";



import { prisma } from "@/lib/prisma";







// ✅ GET: List all forms for the company



export async function GET() {



  const session = await getServerSession(authOptions);







  if (!session?.user?.companyId) {



    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  }







<<<<<<<
  const forms = await prisma.form.findMany({

=======
  console.log('DEBUG: Creating form with visibility settings:', {

    name,

    formType: formType || "SUBMISSION",

    visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],

    visibleToDepartments: visibleToDepartments || [],

    visibleToJobRoles: visibleToJobRoles || [],

  });



  // Create form

  const form = await prisma.form.create({

    data: {

      name,

      slug,

      description,

      formType: formType || "SUBMISSION",

      schema,

      companyId: session.user.companyId,

      visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],

      visibleToDepartments: visibleToDepartments || [],

      visibleToJobRoles: visibleToJobRoles || [],

    },

  });

>>>>>>>


<<<<<<<
    where: { companyId: session.user.companyId },

=======
  console.log('DEBUG: Form created successfully with ID:', form.id);

>>>>>>>


    orderBy: { createdAt: "desc" },



<<<<<<<
  });







  return NextResponse.json(forms);



}







// ✅ POST: Create a new form



export async function POST(req: Request) {



  const session = await getServerSession(authOptions);







  if (!session?.user?.companyId) {



    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  }







  const {



    name,



    slug: providedSlug,



    description,



    formType,



    schema,



    visibleToRoles,



    visibleToDepartments,



    visibleToJobRoles,



  } = await req.json();







  // Validate required fields



  if (!name || !schema) {



    return NextResponse.json({ error: "Name and schema are required" }, { status: 400 });



  }







  // Generate slug from name if not provided



  const slug = providedSlug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");







  // Validate slug format



  const slugRegex = /^[a-z0-9-]+$/;



  if (!slugRegex.test(slug)) {



    return NextResponse.json(



      { error: "Slug can only contain lowercase letters, numbers, and hyphens" },



      { status: 400 }



    );



  }







  // Check for duplicate name or slug



  const existingForm = await prisma.form.findFirst({



    where: {



      companyId: session.user.companyId,



      OR: [{ name }, { slug }],



    },



  });







  if (existingForm) {



    if (existingForm.name === name) {



      return NextResponse.json({ error: "A form with this name already exists" }, { status: 400 });



    }



    if (existingForm.slug === slug) {



      return NextResponse.json({ error: "A form with this path already exists" }, { status: 400 });



    }



  }







  // Create form



  const form = await prisma.form.create({



    data: {



      name,



      slug,



      description,



      formType: formType || "SUBMISSION",



      schema,



      companyId: session.user.companyId,



      visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],



      visibleToDepartments: visibleToDepartments || [],



      visibleToJobRoles: visibleToJobRoles || [],



    },



  });







  return NextResponse.json(form, { status: 201 });



}



=======


  return NextResponse.json(form, { status: 201 });

}

>>>>>>>
