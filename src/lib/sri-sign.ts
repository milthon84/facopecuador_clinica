/**
 * Firma digital XAdES-BES para comprobantes electrónicos SRI Ecuador.
 *
 * Algoritmos:
 *   - Digest:    SHA-1
 *   - Signature: RSA-SHA1
 *   - C14N:      http://www.w3.org/TR/2001/REC-xml-c14n-20010315
 *
 * REGLA CRÍTICA de C14N (causa del Error 39):
 * Cuando <Signature xmlns="..."> declara el namespace, la C14N del <SignedInfo>
 * interior NO incluye el xmlns (ya está en scope del padre). Por tanto, lo que
 * firmamos con RSA debe ser <SignedInfo Id="..."> SIN xmlns.
 */

import forge from "node-forge";
import { createHash } from "crypto";

// ── Utilidades ─────────────────────────────────────────────────────────────

function sha1b64(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha1").update(buf).digest("base64");
}

function nowEcuador(): string {
  const now    = new Date();
  const offset = -5 * 60;
  const local  = new Date(now.getTime() + offset * 60000);
  return local.toISOString().replace("Z", "-05:00");
}

// ── Información del certificado ────────────────────────────────────────────

export interface CertInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
}

export function parseCertInfo(p12Buffer: Buffer, password: string): CertInfo {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
  const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error("No se encontró certificado en el archivo .p12");

  const subject = cert.subject.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(", ");
  const issuer  = cert.issuer.attributes.map((a: any)  => `${a.shortName}=${a.value}`).join(", ");

  // También extraer atributos con OID (para RUC en extensiones personalizadas)
  const allAttrs = cert.subject.attributes.map((a: any) => String(a.value || "")).join(" ");

  return {
    subject: subject + " | ALL:" + allAttrs,
    issuer,
    serialNumber: parseInt(cert.serialNumber, 16).toString(),
    validFrom: (cert.validity.notBefore as Date).toISOString().split("T")[0],
    validTo:   (cert.validity.notAfter  as Date).toISOString().split("T")[0],
  };
}

// ── Firma XAdES-BES ────────────────────────────────────────────────────────

export function signXMLWithP12(xmlString: string, p12Buffer: Buffer, password: string): string {

  // ── 1. Extraer clave y certificado del .p12 ──────────────────────────────
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
  const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  const privateKey = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    [forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })
    [forge.pki.oids.certBag]?.[0]?.cert;

  if (!privateKey || !cert) {
    throw new Error("No se pudo extraer clave o certificado del .p12. Verifique la contraseña.");
  }

  // ── 2. Datos del certificado ─────────────────────────────────────────────
  const certDer      = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const certBase64   = forge.util.encode64(certDer);
  const certDigest   = sha1b64(Buffer.from(certDer, "binary"));
  const issuerName   = cert.issuer.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(",");
  const serialNumber = parseInt(cert.serialNumber, 16).toString();
  const signingTime  = nowEcuador();

  // ── 3. SignedProperties (XAdES-BES) ─────────────────────────────────────
  // Se calcula el digest sobre el texto completo (con xmlns:xades) ya que
  // la Reference a este elemento no especifica transforms, así el SRI usa
  // el fragmento tal cual aparece en el documento.
  const signedPropsXml = [
    `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="Signature-SignedProperties">`,
    `<xades:SignedSignatureProperties>`,
    `<xades:SigningTime>${signingTime}</xades:SigningTime>`,
    `<xades:SigningCertificate>`,
    `<xades:Cert>`,
    `<xades:CertDigest>`,
    `<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>`,
    `<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigest}</ds:DigestValue>`,
    `</xades:CertDigest>`,
    `<xades:IssuerSerial>`,
    `<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerName}</ds:X509IssuerName>`,
    `<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serialNumber}</ds:X509SerialNumber>`,
    `</xades:IssuerSerial>`,
    `</xades:Cert>`,
    `</xades:SigningCertificate>`,
    `</xades:SignedSignatureProperties>`,
    `</xades:SignedProperties>`,
  ].join("");

  const signedPropsDigest = sha1b64(signedPropsXml);

  // ── 4. Document digest ───────────────────────────────────────────────────
  // Incluimos la declaración XML completa — el SRI hashea los bytes tal cual
  // llegan después de aplicar enveloped-signature (sin C14N explícita en el Reference)
  const docDigest = sha1b64(xmlString);

  // ── 5. SignedInfo ────────────────────────────────────────────────────────
  const signedInfoXml = [
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#" Id="Signature-SignedInfo">`,
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>`,
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>`,
    `<Reference Id="SignedProperties-Reference" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature-SignedProperties">`,
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>`,
    `<DigestValue>${signedPropsDigest}</DigestValue>`,
    `</Reference>`,
    `<Reference URI="">`,
    `<Transforms>`,
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>`,
    `</Transforms>`,
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>`,
    `<DigestValue>${docDigest}</DigestValue>`,
    `</Reference>`,
    `</SignedInfo>`,
  ].join("");

  // ── 6. Firmar SignedInfo con RSA-SHA1 ────────────────────────────────────
  // Firmamos signedInfoXml tal cual (sin xmlns) = lo que C14N produce dentro de <Signature>
  const md = forge.md.sha1.create();
  md.update(signedInfoXml, "utf8");
  const signatureBase64 = forge.util.encode64(privateKey.sign(md));

  // ── 7. Ensamblar Signature ───────────────────────────────────────────────
  // <Signature> declara el xmlns; todos los elementos hijo heredan y no necesitan redeclararlo.
  const signatureXml = [
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="Signature">`,
    signedInfoXml,
    `<SignatureValue Id="SignatureValue">${signatureBase64}</SignatureValue>`,
    `<KeyInfo Id="Certificate">`,
    `<X509Data>`,
    `<X509Certificate>${certBase64}</X509Certificate>`,
    `</X509Data>`,
    `</KeyInfo>`,
    `<Object Id="QualifyingProperties">`,
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">`,
    signedPropsXml,
    `</xades:QualifyingProperties>`,
    `</Object>`,
    `</Signature>`,
  ].join("");

  // ── 8. Insertar firma antes de </factura> ────────────────────────────────
  return xmlString.replace(/<\/factura>\s*$/, `${signatureXml}</factura>`);
}
