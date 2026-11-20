/** Synthetic cross-provider import policy reference. Not production middleware. */
export function decideImport({principal, destination, manifest, verifiedDigest, now}) {
  const deny = reason => ({allowed:false, reason});
  if (!principal?.id || !principal?.tenantId || !destination?.tenantId || !destination?.projectId) return deny('missing authenticated context');
  if (principal.tenantId !== destination.tenantId) return deny('tenant mismatch');
  if (!manifest || manifest.schema !== 'spine.export.v0' || !manifest.sourceTenantId || !manifest.sourceProjectId || !manifest.contentDigest) return deny('invalid manifest');
  if (!verifiedDigest || verifiedDigest !== manifest.contentDigest) return deny('content integrity not verified');
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(manifest.expiresAt) || now >= manifest.expiresAt) return deny('expired manifest');
  if (!Array.isArray(destination.grants)) return deny('no destination grants');
  const grant = destination.grants.find(g => g.principalId === principal.id && g.tenantId === destination.tenantId && g.projectId === destination.projectId && g.action === 'continuity:import' && Number.isSafeInteger(g.expiresAt) && now < g.expiresAt && g.revoked !== true);
  if (!grant) return deny('destination import grant required');
  return {allowed:true, destinationTenantId:destination.tenantId, destinationProjectId:destination.projectId, importedPermissions:[], contentDigest:manifest.contentDigest};
}
