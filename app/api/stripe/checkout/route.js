import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { getStripe } from "../../../../lib/stripe";
import { getCourseById } from "../../../../lib/queries";

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Set STRIPE_SECRET_KEY in your environment." },
      { status: 501 }
    );
  }

  const { courseId } = await req.json().catch(() => ({}));
  const course = getCourseById(courseId);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (course.price_cents <= 0) return NextResponse.json({ error: "This course is free." }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: course.price_cents,
          product_data: { name: course.title, description: course.description || undefined },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: user.id, courseId: course.id },
    success_url: `${siteUrl}/courses/${course.slug}?checkout=success`,
    cancel_url: `${siteUrl}/courses/${course.slug}?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
