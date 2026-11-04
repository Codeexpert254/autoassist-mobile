function normalizeIdentityNumber(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeRecognizedText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function looksLikeKenyanNationalId(value: string) {
  const upper = value.toUpperCase();
  return (
    upper.includes("REPUBLIC OF KENYA") ||
    upper.includes("IDENTITY CARD") ||
    upper.includes("NATIONAL ID") ||
    /\bID\s*(NO|NUMBER)\b/.test(upper)
  );
}

export async function verifyNationalIdImageMatchesNumber(uri: string, enteredNumber: string) {
  const normalizedNumber = normalizeIdentityNumber(enteredNumber);
  if (!/^[A-Z0-9]{6,20}$/.test(normalizedNumber)) {
    throw new Error("Enter your National ID number before taking or uploading the ID photo.");
  }

  let ocr: typeof import("expo-mlkit-ocr");
  try {
    ocr = await import("expo-mlkit-ocr");
  } catch {
    throw new Error(
      "ID text scanning is not available in this build. Install the AutoAssist development build and try again.",
    );
  }

  if (!ocr.isSupported()) {
    throw new Error("ID text scanning is not supported on this device.");
  }

  let recognizedText = "";
  try {
    const result = await ocr.recognizeText(uri);
    recognizedText = result.text ?? "";
  } catch {
    throw new Error(
      "AutoAssist could not read the ID clearly. Retake the photo in good light with the full ID number visible.",
    );
  }

  if (!recognizedText.trim()) {
    throw new Error(
      "AutoAssist could not detect text on this image. Retake the National ID photo closer and in better light.",
    );
  }

  if (!looksLikeKenyanNationalId(recognizedText)) {
    throw new Error(
      "This image does not appear to be a Kenyan National ID. Please photograph the ID side where the ID number is visible.",
    );
  }

  const normalizedRecognizedText = normalizeRecognizedText(recognizedText);
  if (!normalizedRecognizedText.includes(normalizedNumber)) {
    throw new Error(
      "The ID number you entered does not match the number detected on the National ID photo. Check the number and try again.",
    );
  }

  return true;
}
