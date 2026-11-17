import { upload } from "@vercel/blob/client";
import { apiJson } from "@/lib/clients/http";
import { isLocalMode, localBucket, localObjectUrl } from "@/lib/local-mode";
import { createClient } from "@/lib/supabase/client";
import {
	LocalUploadGrant,
	uploadPathname,
	type UploadKind,
} from "./upload-files";

// Vercel Blob recommends multipart above this size
const MULTIPART_MIN_BYTES = 100 * 1024 * 1024;

export async function uploadFile(
	kind: UploadKind,
	file: File,
): Promise<string> {
	const pathname = uploadPathname(file.name);
	if (isLocalMode()) return uploadLocally(kind, pathname, file);
	const { url } = await upload(pathname, file, {
		access: "public",
		handleUploadUrl: `/api/upload/${kind}`,
		contentType: file.type,
		multipart: file.size > MULTIPART_MIN_BYTES,
	});
	return url;
}

async function uploadLocally(
	kind: UploadKind,
	pathname: string,
	file: File,
): Promise<string> {
	const { token } = await apiJson(`/api/upload/${kind}`, LocalUploadGrant, {
		method: "POST",
		body: { pathname },
	});
	const { error } = await createClient()
		.storage.from(localBucket())
		.uploadToSignedUrl(pathname, token, file, { contentType: file.type });
	if (error) throw error;
	return localObjectUrl(pathname);
}
