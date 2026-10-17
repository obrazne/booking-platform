import { redirect } from "next/navigation";

/** Link from the review invitation (Z34): the form is part of the stay in the account (Z38). */
export default async function ReviewLink({ params }: PageProps<"/ucet/pobyt/[id]/hodnotenie">) {
  const { id } = await params;
  redirect(`/ucet/pobyt/${id}#hodnotenie`);
}
