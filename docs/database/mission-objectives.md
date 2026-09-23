# Mission Objectives and Scope

## Mission statement

> The purpose of the Movie Reservation System database is to maintain the data used to
> schedule movie showings and to reserve seats for those showings.

## Mission objectives

| Objective                                                               | Requirement                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **MO-01** Maintain complete customer account information.               | R1 — Users must be able to sign up and log in.                                                 |
| **MO-02** Maintain the role assigned to each account.                   | R2 — The system must distinguish administrators from regular users.                            |
| **MO-03** Track changes of role, including promotion to administrator.  | R3 — Only an administrator may promote another user to administrator.                          |
| **MO-04** Maintain complete movie information.                          | R4, R5 — Admins add, update and remove movies; each has a title, description and poster.       |
| **MO-05** Maintain the genres to which each movie belongs.              | R6 — Movies must be categorised by genre.                                                      |
| **MO-06** Maintain complete hall information.                           | R7 — Showtimes must be scheduled into a physical location.                                     |
| **MO-07** Maintain the seating layout of each hall.                     | R9, R12 — Customers see and select individual seats; a seat must be individually identifiable. |
| **MO-08** Maintain the schedule of showtimes for each movie.            | R7, R8 — Customers retrieve movies and their showtimes for a specific date.                    |
| **MO-09** Track which seats are available for a given showtime.         | R9 — Customers must be able to see the available seats for a showtime.                         |
| **MO-10** Track seats a customer has selected but not yet confirmed.    | R12 — The system must prevent two customers from reserving the same seat.                      |
| **MO-11** Maintain complete reservation information for each customer.  | R9, R10 — Customers reserve seats and view their own reservations.                             |
| **MO-12** Maintain the tickets issued for each reservation.             | R9 — A confirmed reservation must yield an admissible ticket per seat.                         |
| **MO-13** Track cancellation of a reservation and release of its seats. | R10 — Customers may cancel reservations, but only upcoming ones.                               |
| **MO-17** Report on revenue for a given period, cinema, or movie.       | R11 — Administrators must be able to see revenue.                                              |
| **MO-18** Report on seating capacity and occupancy for each showtime.   | R11 — Administrators must be able to see capacity.                                             |
| **MO-19** Report on all reservations across all customers.              | R11 — Administrators must be able to see all reservations.                                     |
| **MO-20** Maintain an initial administrator account set at deployment.  | R13 — The initial administrator is created using seed data.                                    |
| **MO-21** Maintain each customer's token wallet and its top-up history. | R14 — Customers buy tokens by card from fixed packages and see their balance and history.      |

MO-14 (ticket admission tracking), MO-15 (wallet balance and transactions) and MO-16
(promotional codes) were **removed rather than renumbered**, so the remaining MO-01…MO-13 and
MO-17…MO-20 keep the numbers other phases already cite. MO-06 was narrowed from "cinema and
hall information" to "hall information" — there is no separate cinema/venue entity.

MO-21 brings the wallet back as a **new** objective rather than reinstating MO-15. It is
narrower than MO-15 was: buying tokens only, not paying for reservations with them (ADR-017,
DDR-024).

## Requirement sources

R1–R13 are stated requirements of the capstone brief. R14 is a product extension adopted by
ADR-017.

| Code | Brief section                       | Requirement                                                                     |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------- |
| R1   | User Authentication & Authorization | Users should be able to sign up and log in.                                     |
| R2   | User Authentication & Authorization | Roles are required for users, such as admin and regular user.                   |
| R3   | User Authentication & Authorization | Only admins should be able to promote other users to admin.                     |
| R4   | Movie Management                    | Admins should be able to add, update, and delete movies.                        |
| R5   | Movie Management                    | Each movie should have a title, description, and poster image.                  |
| R6   | Movie Management                    | Movies should be categorized by genre.                                          |
| R7   | Movie Management                    | Movies should have showtimes.                                                   |
| R8   | Reservation Management              | Users should be able to get movies and their showtimes for a specific date.     |
| R9   | Reservation Management              | Users should be able to reserve seats, see available seats, and select seats.   |
| R10  | Reservation Management              | Users should be able to see their reservations and cancel them (only upcoming). |
| R11  | Reservation Management              | Admins should be able to see all reservations, capacity, and revenue.           |
| R12  | Implementation Considerations       | The design must avoid overbooking and handle seat reservations correctly.       |
| R13  | User Authentication & Authorization | The initial admin may be created using seed data.                               |
| R14  | Extension — not in the brief        | Users should be able to buy tokens by card into a wallet (ADR-017).             |

## Out of scope

Recorded here so later phases do not silently reintroduce them.

| Excluded                                     | Reason                                                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paying for a reservation with tokens         | Tokens can be bought (MO-21) but not yet spent; a reservation still confirms with no payment step. Out of scope until its own record — see DDR-024. |
| Promotional codes and discounts              | Not part of the approved Proposal's Reservations scope.                                                                                             |
| QR codes and admission scanning              | The Proposal covers reserving and viewing reservations only. A reservation still yields a ticket with a reference number (MO-12).                   |
| Push notification delivery and device tokens | Present in the existing mobile application, but supports no mission objective above.                                                                |
| Multiple cinema locations                    | Showtimes are scheduled into halls directly, with no separate cinema/venue entity.                                                                  |
| Social sign-in provider records              | Authentication is by email and password (R1); ADR-005 self-issues JWTs rather than delegating to a third-party provider.                            |
| Cast, crew and trailers                      | Movie Management is limited to title, description, poster image and genre.                                                                          |
| Multi-currency and multi-region pricing      | No objective requires more than a single currency.                                                                                                  |
| Seat-level dynamic pricing                   | A showtime has a single price (BR-07); no requirement varies it. The `seat_type` field is dropped for the same reason.                              |

## Where the current schema came from

Unlike a greenfield design, this project has a genuine existing database: the Expo /
React Native mobile application runs against a Supabase PostgreSQL instance, accessed directly
through PostgREST and stored procedures. That schema — 15 base tables, 1 view, 11 stored
functions — was analysed at `vietpham-agilityio/react-native`, branch `feat/expo-practice`.

Three findings from that analysis drive the whole design:

1. **Seats are stored as text labels inside array and JSON columns**, which is why seat-level
   reservation cannot be locked reliably. This is the root cause of the overbooking risk in
   MO-10 and R12, and the reason for ADR-007 and BR-17.
2. **There is no concept of a user role**, so MO-02 and MO-03 cannot be satisfied by it at
   all.
3. **Several calculated values are stored as columns**, which can and do drift from the
   values they summarise. This is the reason for DDR-003 and DDR-010.
