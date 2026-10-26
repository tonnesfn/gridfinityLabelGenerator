export interface SavedCsv {
  id: string;
  name: string;
  savedAt: string;
}

const endpoint = `${import.meta.env.BASE_URL}api/csvs`;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Unable to access saved CSVs. Please try again.");
  }
  return response.json();
}

export const listSavedCsvs = () => request<SavedCsv[]>(endpoint);
export const getSavedCsv = (id: string) => request<SavedCsv & { content: string }>(`${endpoint}/${id}`);
export const saveCsv = (name: string, content: string) => request<SavedCsv>(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, content }),
});
