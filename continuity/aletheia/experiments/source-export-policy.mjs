/** Source-side synthetic export preflight. NOT authentication, storage or crypto. */
export function decideExport({principal,source,grant,request,now}) {
 const deny=reason=>({allowed:false,reason});
 if(!principal?.id||!principal?.tenantId||!source?.tenantId||!source?.projectId||!source?.recordId)return deny('missing identity or source');
 if(principal.tenantId!==source.tenantId)return deny('source tenant mismatch');
 if(!request||request.action!=='continuity:export'||!request.destinationTenantId||!request.destinationProjectId||!request.nonce||!/^[a-zA-Z0-9_-]{16,128}$/.test(request.nonce))return deny('invalid export request');
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(request.expiresAt)||now>=request.expiresAt||request.expiresAt>now+300000)return deny('expired or excessive request lifetime');
 if(!grant||grant.principalId!==principal.id||grant.tenantId!==source.tenantId||grant.projectId!==source.projectId||grant.action!=='continuity:export'||grant.revoked===true||!Number.isSafeInteger(grant.expiresAt)||now>=grant.expiresAt)return deny('current source export grant required');
 if(grant.recordId&&grant.recordId!==source.recordId)return deny('record scope mismatch');
 if(source.exportable!==true||source.deleted===true||source.privateVault!==true)return deny('record not eligible for export');
 if(request.includeGrants||request.includeCredentials||request.includeWallet||request.includeSecrets)return deny('authority or secrets cannot be exported');
 return {allowed:true,sourceTenantId:source.tenantId,sourceProjectId:source.projectId,recordId:source.recordId,destinationTenantId:request.destinationTenantId,destinationProjectId:request.destinationProjectId,nonce:request.nonce,expiresAt:request.expiresAt,exportedAuthority:[]};
}
