/**
 * Firma digital XAdES-BES para comprobantes electrónicos SRI Ecuador.
 * Usa xml-crypto v6 con idMode='id' (minúscula) para <factura id="comprobante">.
 */

import forge from "node-forge";
import { createHash } from "crypto";
import { SignedXml } from "xml-crypto";

// ── Utilidades ─────────────────────────────────────────────────────────────

function sha1b64(data: Buffer | string): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha1").update(buf).digest("base64");
}

function nowEcuador(): string {
  const now    = new Date();
  const local  = new Date(now.getTime() + (-5 * 60) * 60000);
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

  // 1. Extraer clave y certificado
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

  // 2. Datos del certificado
  const certDer      = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const certBase64   = forge.util.encode64(certDer);
  const certDigest   = sha1b64(Buffer.from(certDer, "binary"));
  const issuerName   = cert.issuer.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(",");
  const serialNumber = parseInt(cert.serialNumber, 16).toString();
  const signingTime  = nowEcuador();
  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

  // 3. XAdES SignedProperties
  const signedPropsId  = "Signature-SignedProperties";
  const signedPropsXml = [
    `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signedPropsId}">`,
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

  // 4. Inyectar QualifyingProperties en el XML antes de firmar
  //    para que el xml-crypto lo incluya en el documento
  const qualifyingBlock = [
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">`,
    signedPropsXml,
    `</xades:QualifyingProperties>`,
  ].join("");

  // Insertar el qualifying block al final de <factura> para que quede en el documento
  const xmlConQualifying = xmlString.replace(
    /<\/factura>\s*$/,
    `${qualifyingBlock}</factura>`
  );

  // 5. Configurar xml-crypto
  const sigOptions: any = {
    idMode: "id",          // ← CRÍTICO: id en minúscula para <factura id="comprobante">
    privateKey: privateKeyPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  };
  const sig = new SignedXml(sigOptions);

  // Referencia al elemento <factura id="comprobante">
  sig.addReference({
    xpath: `//*[@id='comprobante']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: "#comprobante",
    isEmptyUri: false,
  });

  // Referencia a SignedProperties (XAdES)
  sig.addReference({
    xpath: `//*[@Id='${signedPropsId}']`,
    transforms: ["http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    digestValue: signedPropsDigest,
    uri: `#${signedPropsId}`,
    isEmptyUri: false,
  });

  // Proveedor de información del certificado
  sig.getKeyInfoContent = () =>
    `<ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data>`;

  // 6. Calcular firma
  sig.computeSignature(xmlConQualifying, {
    prefix: "ds",
    location: {
      reference: `//*[@id='comprobante']`,
      action: "append",
    },
  });

  return sig.getSignedXml();
}
