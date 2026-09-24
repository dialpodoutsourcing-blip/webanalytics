import { getConnectionStatus } from "@/features/google/oauth";

export default async function Settings({searchParams}:{searchParams:Promise<{connected?:string;error?:string}>}) {
  const [params, status] = await Promise.all([searchParams, getConnectionStatus()]);
  const heading = status.connected ? "Connected owner Google account" : status.needsAttention ? "Connection needs attention" : "Connect owner Google account";
  const action = status.connected ? "Reconnect Google" : "Connect owner Google account";
  return <section>
    <div className="page-title"><div><p>Workspace</p><h2>Settings</h2></div></div>
    {params.error === "google_connection" && <div className="state state-stale"><strong>Google connection failed</strong><span>The shared Google connection could not be saved. Try connecting the owner account again.</span></div>}
    {params.connected === "1" && status.connected && <div className="state"><strong>Google connected</strong><span>This connection is shared by every portal session.</span></div>}
    <div className="card settings">
      <span>Google Search Console</span><h2>{heading}</h2>
      <p>{status.connected ? "All portal users automatically use the Search Console properties available to this owner account." : "Authorize the owner account once. Its encrypted refresh token is shared across portal sessions and computers."}</p>
      <a className="button" href="/api/auth/google/start">{action}</a>
    </div>
  </section>;
}
