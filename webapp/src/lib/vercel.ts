// Vercel deploy via the v13 deployments REST API.
// Deploys a single index.html file as a static site.
//
// Returns { url } where url is the deployment's public URL.

interface VercelDeployment {
  id: string;
  url: string; // e.g. yap-app-abc123.vercel.app
  readyState?: string;
}

export interface DeployResult {
  url: string;
  id: string;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "yap-app";
}

export async function deployToVercel(
  token: string,
  title: string,
  html: string,
): Promise<DeployResult> {
  const projectName = `yap-${slug(title)}-${Math.random().toString(36).slice(2, 6)}`;

  const body = {
    name: projectName,
    files: [
      {
        file: "index.html",
        data: Buffer.from(html, "utf8").toString("base64"),
        encoding: "base64",
      },
    ],
    projectSettings: {
      framework: null,
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    },
    target: "production",
  };

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vercel deploy failed: ${res.status} ${errText}`);
  }

  const dep = (await res.json()) as VercelDeployment;
  return {
    id: dep.id,
    url: dep.url.startsWith("http") ? dep.url : `https://${dep.url}`,
  };
}
