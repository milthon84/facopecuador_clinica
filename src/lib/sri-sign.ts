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
  let p12: any;
  try {
    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  } catch (e: any) {
    throw new Error(`Contraseña del certificado incorrecta o archivo .p12 dañado: ${e.message}`);
  }

  const privateKey = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    [forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })
    [forge.pki.oids.certBag]?.[0]?.cert;

  if (!privateKey) {
    throw new Error("No se encontró clave privada en el .p12. Verifica que la contraseña sea correcta.");
  }
  if (!cert) {
    throw new Error("No se encontró certificado en el .p12.");
  }

  // Verificar que la clave privada es válida haciendo una operación básica
  try {
    const testMd = forge.md.sha1.create();
    testMd.update("test");
    privateKey.sign(testMd);
  } catch (e: any) {
    throw new Error(`La clave privada del .p12 no es válida (posible contraseña incorrecta): ${e.message}`);
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
  // xmlns:ds declarado UNA SOLA VEZ en la raíz — evita redundancias que
  // pueden alterar el hash cuando el SRI aplica C14N al elemento.
  const signedPropsXml = [
    `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-SignedProperties">`,
    `<xades:SignedSignatureProperties>`,
    `<xades:SigningTime>${signingTime}</xades:SigningTime>`,
    `<xades:SigningCertificate>`,
    `<xades:Cert>`,
    `<xades:CertDigest>`,
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>`,
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

  const signedPropsDigest = sha1b64(signedPropsXml);

  // ── 4. Document digest ───────────────────────────────────────────────────
  // URI="#comprobante" apunta al elemento <factura id="comprobante"> (sin declaración XML)
  // El hash se calcula SOLO sobre el elemento <factura>, no incluye <?xml...?>
  const xmlSinDeclaracion = xmlString.replace(/^<\?xml[^?]*\?>/, "");
  const docDigest = sha1b64(xmlSinDeclaracion);

  // ── 5. SignedInfo con prefijo ds: (estándar referencia SRI Ecuador) ───────
  // Usamos ds: en lugar de namespace por defecto — algunos validadores Java
  // del SRI tienen mejor compatibilidad con el prefijo explícito.
  const DS = "http://www.w3.org/2000/09/xmldsig#";
  const signedInfoXml = [
    `<ds:SignedInfo xmlns:ds="${DS}" Id="Signature-SignedInfo">`,
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>`,
    `<ds:SignatureMethod Algorithm="${DS}rsa-sha1"/>`,
    `<ds:Reference Id="Signature-Reference-SignedProperties" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature-SignedProperties">`,
    `<ds:DigestMethod Algorithm="${DS}sha1"/>`,
    `<ds:DigestValue>${signedPropsDigest}</ds:DigestValue>`,
    `</ds:Reference>`,
    `<ds:Reference Id="Signature-Reference-comprobante" URI="#comprobante">`,
    `<ds:Transforms>`,
    `<ds:Transform Algorithm="${DS}enveloped-signature"/>`,
    `</ds:Transforms>`,
    `<ds:DigestMethod Algorithm="${DS}sha1"/>`,
    `<ds:DigestValue>${docDigest}</ds:DigestValue>`,
    `</ds:Reference>`,
    `</ds:SignedInfo>`,
  ].join("");

  // ── 6. Firmar SignedInfo con RSA-SHA1 ────────────────────────────────────
  const md = forge.md.sha1.create();
  md.update(signedInfoXml, "utf8");
  const signatureBase64 = forge.util.encode64(privateKey.sign(md));

  // ── 7. Ensamblar Signature con prefijo ds: ────────────────────────────────
  const signatureXml = [
    `<ds:Signature xmlns:ds="${DS}" Id="Signature">`,
    signedInfoXml,
    `<ds:SignatureValue Id="SignatureValue">${signatureBase64}</ds:SignatureValue>`,
    `<ds:KeyInfo Id="Certificate">`,
    `<ds:X509Data>`,
    `<ds:X509Certificate>${certBase64}</ds:X509Certificate>`,
    `</ds:X509Data>`,
    `</ds:KeyInfo>`,
    `<ds:Object Id="QualifyingProperties">`,
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">`,
    signedPropsXml,
    `</xades:QualifyingProperties>`,
    `</ds:Object>`,
    `</ds:Signature>`,
  ].join("");

  // ── 8. Insertar firma antes de </factura> ────────────────────────────────
  return xmlString.replace(/<\/factura>\s*$/, `${signatureXml}</factura>`);
}
