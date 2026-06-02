/**
 * Firma digital XAdES-BES para comprobantes electrónicos SRI Ecuador.
 * Implementación custom con todos los fixes aplicados:
 * - XML minificado (sin whitespace)
 * - Sin CDATA
 * - URI="#comprobante" (elemento raíz con id="comprobante")
 * - Transforms: enveloped-signature + C14N
 * - docDigest sin declaración XML (URI apunta al elemento, no al documento)
 * - Prefijo ds: para XMLDSig
 * - QualifyingProperties dentro de ds:Object (no en factura directamente)
 */

import forge from "node-forge";
import { createHash } from "crypto";

// ── Utilidades ─────────────────────────────────────────────────────────────

function sha1b64(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha1").update(buf).digest("base64");
}

function nowEcuador(): string {
  const now   = new Date();
  const local = new Date(now.getTime() + (-5 * 60) * 60000);
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
  const p12Asn1  = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
  const p12      = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error("No se encontró certificado en el archivo .p12");

  const subject  = cert.subject.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(", ");
  const issuer   = cert.issuer.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(", ");
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
  const DS    = "http://www.w3.org/2000/09/xmldsig#";
  const XADES = "http://uri.etsi.org/01903/v1.3.2#";
  const C14N  = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

  // ── 1. Extraer clave y certificado ───────────────────────────────────────
  let p12: any;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch (e: any) {
    throw new Error(`Contraseña del certificado incorrecta: ${e.message}`);
  }

  const privateKey = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    [forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })
    [forge.pki.oids.certBag]?.[0]?.cert;

  if (!privateKey) throw new Error("No se encontró clave privada en el .p12.");
  if (!cert)       throw new Error("No se encontró certificado en el .p12.");

  // ── 2. Datos del certificado ─────────────────────────────────────────────
  const certDer      = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const certBase64   = forge.util.encode64(certDer);
  const certDigest   = sha1b64(Buffer.from(certDer, "binary"));
  const issuerName   = cert.issuer.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(",");
  const serialNumber = parseInt(cert.serialNumber, 16).toString();
  const signingTime  = nowEcuador();

  // ── 3. XAdES SignedProperties ────────────────────────────────────────────
  // signedPropsXml: con xmlns, se inyecta en el documento (válido standalone)
  const signedPropsXml = [
    `<xades:SignedProperties xmlns:xades="${XADES}" xmlns:ds="${DS}" Id="Signature-SignedProperties">`,
    `<xades:SignedSignatureProperties>`,
    `<xades:SigningTime>${signingTime}</xades:SigningTime>`,
    `<xades:SigningCertificate>`,
    `<xades:Cert>`,
    `<xades:CertDigest>`,
    `<ds:DigestMethod Algorithm="${DS}sha1"></ds:DigestMethod>`,
    `<ds:DigestValue>${certDigest}</ds:DigestValue>`,
    `</xades:CertDigest>`,
    `<xades:IssuerSerial>`,
    `<ds:X509IssuerName>${issuerName}</ds:X509IssuerName>`,
    `<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>`,
    `</xades:IssuerSerial>`,
    `</xades:Cert>`,
    `</xades:SigningCertificate>`,
    `</xades:SignedSignatureProperties>`,
    `</xades:SignedProperties>`,
  ].join("");

  // signedPropsC14n: forma C14N que el SRI calculará al verificar el digest.
  // El padre <xades:QualifyingProperties xmlns:xades="..."> ya declara xmlns:xades,
  // y el abuelo <ds:Signature xmlns:ds="..."> ya declara xmlns:ds.
  // C14N: (1) elimina declaraciones de ns ya en scope, (2) self-closing → <tag></tag>
  const signedPropsC14n = [
    `<xades:SignedProperties Id="Signature-SignedProperties">`,
    `<xades:SignedSignatureProperties>`,
    `<xades:SigningTime>${signingTime}</xades:SigningTime>`,
    `<xades:SigningCertificate>`,
    `<xades:Cert>`,
    `<xades:CertDigest>`,
    `<ds:DigestMethod Algorithm="${DS}sha1"></ds:DigestMethod>`,
    `<ds:DigestValue>${certDigest}</ds:DigestValue>`,
    `</xades:CertDigest>`,
    `<xades:IssuerSerial>`,
    `<ds:X509IssuerName>${issuerName}</ds:X509IssuerName>`,
    `<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>`,
    `</xades:IssuerSerial>`,
    `</xades:Cert>`,
    `</xades:SigningCertificate>`,
    `</xades:SignedSignatureProperties>`,
    `</xades:SignedProperties>`,
  ].join("");

  const signedPropsDigest = sha1b64(signedPropsC14n);

  // ── 4. Document digest ───────────────────────────────────────────────────
  // URI="#comprobante" apunta al elemento <factura id="comprobante">
  // → hash del elemento SIN la declaración XML (C14N la excluye)
  // → SIN la Signature (enveloped-signature la remueve)
  // Para XML minificado sin namespaces complejos, C14N ≈ texto plano
  const xmlSinDeclaracion = xmlString.replace(/^<\?xml[^?]*\?>/, "");
  const docDigest = sha1b64(xmlSinDeclaracion);

  // ── 5. SignedInfo SIN xmlns:ds ───────────────────────────────────────────
  // El padre <ds:Signature xmlns:ds="..."> ya declara xmlns:ds.
  // C14N del <ds:SignedInfo> como elemento hijo NO re-incluye xmlns:ds
  // porque el padre ya lo tiene en scope. Firmamos exactamente lo que
  // el SRI verificará con C14N.
  // SignedInfo en forma C14N exacta que el SRI verificará:
  // - Sin xmlns:ds (el padre <ds:Signature xmlns:ds="..."> ya lo tiene en scope)
  // - Sin self-closing tags: C14N convierte <tag/> a <tag></tag>
  const signedInfoXml = [
    `<ds:SignedInfo Id="Signature-SignedInfo">`,
    `<ds:CanonicalizationMethod Algorithm="${C14N}"></ds:CanonicalizationMethod>`,
    `<ds:SignatureMethod Algorithm="${DS}rsa-sha1"></ds:SignatureMethod>`,
    `<ds:Reference Id="Signature-Reference-SignedProperties" Type="${XADES}SignedProperties" URI="#Signature-SignedProperties">`,
    `<ds:Transforms><ds:Transform Algorithm="${C14N}"></ds:Transform></ds:Transforms>`,
    `<ds:DigestMethod Algorithm="${DS}sha1"></ds:DigestMethod>`,
    `<ds:DigestValue>${signedPropsDigest}</ds:DigestValue>`,
    `</ds:Reference>`,
    `<ds:Reference Id="Signature-Reference-comprobante" URI="#comprobante">`,
    `<ds:Transforms>`,
    `<ds:Transform Algorithm="${DS}enveloped-signature"></ds:Transform>`,
    `<ds:Transform Algorithm="${C14N}"></ds:Transform>`,
    `</ds:Transforms>`,
    `<ds:DigestMethod Algorithm="${DS}sha1"></ds:DigestMethod>`,
    `<ds:DigestValue>${docDigest}</ds:DigestValue>`,
    `</ds:Reference>`,
    `</ds:SignedInfo>`,
  ].join("");

  // ── 6. Firmar SignedInfo con RSA-SHA1 ────────────────────────────────────
  const md = forge.md.sha1.create();
  md.update(signedInfoXml, "utf8");
  const signatureBase64 = forge.util.encode64(privateKey.sign(md));

  // ── 7. Ensamblar Signature completa ──────────────────────────────────────
  const signatureXml = [
    `<ds:Signature xmlns:ds="${DS}" Id="Signature">`,
    signedInfoXml,
    `<ds:SignatureValue Id="SignatureValue">${signatureBase64}</ds:SignatureValue>`,
    `<ds:KeyInfo Id="Certificate">`,
    `<ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data>`,
    `</ds:KeyInfo>`,
    `<ds:Object Id="QualifyingProperties">`,
    `<xades:QualifyingProperties xmlns:xades="${XADES}" Target="#Signature">`,
    signedPropsXml,
    `</xades:QualifyingProperties>`,
    `</ds:Object>`,
    `</ds:Signature>`,
  ].join("");

  // ── 8. Insertar Signature antes de </factura> ────────────────────────────
  return xmlString.replace(/<\/factura>\s*$/, `${signatureXml}</factura>`);
}
