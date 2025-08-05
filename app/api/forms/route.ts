import { NextResponse } from "next/server";



import { getServerSession } from "next-auth";



import { authOptions } from "@/lib/auth-options";



import { prisma } from "@/lib/prisma";







// GET: List all forms for the company



export async function GET() {



<<<<<<<
  const session = await getServerSession(authOptions);

=======
  const { name, slug, description, schema, visibleToRoles, visibleToDepartments, visibleToJobRoles } = await req.json();

>>>>>>>






<<<<<<<
  if (!session?.user?.companyId)

=======
  if (!slug) {

    return NextResponse.json({ error: "Slug is required" }, { status: 400 });

  }

>>>>>>>


<<<<<<<
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

=======
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

      return NextResponse.json(

        { error: "A form with this name already exists" },

        { status: 400 }

      );

    }

    if (existingForm.slug === slug) {

      return NextResponse.json(

        { error: "A form with this path already exists" },

        { status: 400 }

      );

    }

  }



const form = await prisma.form.create({

  data: {

    name,

    slug,

    description,

    schema,

    companyId: session.user.companyId,

    visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],

    visibleToDepartments: visibleToDepartments || [],

    visibleToJobRoles: visibleToJobRoles || [],

  },

});

>>>>>>>






  const forms = await prisma.form.findMany({



    where: { companyId: session.user.companyId },



    orderBy: { createdAt: "desc" },



  });







  return NextResponse.json(forms);



}







// POST: Create a new form



export async function POST(req: Request) {



  const session = await getServerSession(authOptions);







  if (!session?.user?.companyId)



    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });







  const { name, description, schema, visibleToRoles, visibleToDepartments, visibleToJobRoles } = await req.json();







  if (!name || !schema) {



    return NextResponse.json({ error: "Name and schema are required" }, { status: 400 });



  }







  const slug = name.toLowerCase().replace(/\s+/g, '-');







const form = await prisma.form.create({



  data: {



    name,



    description,



    schema,



    companyId: session.user.companyId,



    visibleToRoles: visibleToRoles || ["ADMIN", "MANAGER", "EMPLOYEE"],



    visibleToDepartments: visibleToDepartments || [],



    visibleToJobRoles: visibleToJobRoles || [],



    slug, // ✅ required



  },



});







  return NextResponse.json(form, { status: 201 });



}



