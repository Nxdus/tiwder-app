import { findBookingConflict, isTutorBooking, type TutorBooking } from "./bookings";

const databaseName = "tiwder-tutor-demo";
const storeName = "bookings";

export const bookingChannelName = "tiwder-tutor-bookings";

export type ReservationResult = {
  status: "reserved" | "conflict";
  booking: TutorBooking;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser booking storage is unavailable."));
      return;
    }

    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function validateBookings(value: unknown): TutorBooking[] {
  if (!Array.isArray(value) || !value.every(isTutorBooking)) {
    throw new Error("Saved booking data could not be read.");
  }
  return value;
}

export async function readBookings(): Promise<TutorBooking[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    transaction.oncomplete = () => {
      database.close();
      try {
        resolve(validateBookings(request.result));
      } catch (error) {
        reject(error);
      }
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not read saved bookings."));
    };
  });
}

export async function reserveBooking(
  booking: TutorBooking,
  existingBookings: readonly TutorBooking[],
): Promise<ReservationResult> {
  if (!isTutorBooking(booking)) throw new Error("Invalid booking date or time.");
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    // Keep the check and insert in one transaction so two tabs cannot reserve
    // overlapping times after reading the same availability snapshot.
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    let result: ReservationResult;
    let validationError: unknown;

    request.onsuccess = () => {
      try {
        const conflict = findBookingConflict([
          ...existingBookings, ...validateBookings(request.result),
        ], booking);
        if (conflict) {
          result = { status: "conflict", booking: conflict };
        } else {
          store.add(booking);
          result = { status: "reserved", booking };
        }
      } catch (error) {
        validationError = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onabort = () => {
      database.close();
      reject(validationError ?? transaction.error ?? new Error("Could not save the booking."));
    };
  });
}
