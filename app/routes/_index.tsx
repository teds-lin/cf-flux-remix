import { redirect, type LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async ({ context }) => {
    return redirect("/generate-image");
};

export default function Index() {
  return null;
}
