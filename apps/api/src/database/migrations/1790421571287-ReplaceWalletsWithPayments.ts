import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceWalletsWithPayments1790421571287 implements MigrationInterface {
  name = 'ReplaceWalletsWithPayments1790421571287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "stripe_customer_id" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d8c862b32927a5008fed494b1ec" UNIQUE ("stripe_customer_id"), CONSTRAINT "REL_8a1a136d64f734faad02af1888" UNIQUE ("user_id"), CONSTRAINT "PK_e7abeb831f94d053cf4f3f20d80" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "showtime_id" uuid NOT NULL, "reservation_id" uuid, "hold_ids" uuid array NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "amount_cents" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'usd', "payment_method_id" character varying NOT NULL, "card_brand" character varying, "card_last4" character varying, "stripe_payment_intent_id" character varying, "stripe_refund_id" character varying, "failure_code" character varying, "failure_message" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_94c6e6376625bc6710d7dbb4b6b" UNIQUE ("stripe_payment_intent_id"), CONSTRAINT "UQ_973ec920676d86e47d67441909b" UNIQUE ("stripe_refund_id"), CONSTRAINT "REL_9ed5ff4942e09edfd44ee0ccf0" UNIQUE ("reservation_id"), CONSTRAINT "chk_payments_succeeded_has_reservation" CHECK ("status" <> 'succeeded' OR "reservation_id" IS NOT NULL), CONSTRAINT "chk_payments_amount_positive" CHECK ("amount_cents" > 0), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b563a5aa5b8220de29579c464f" ON "payments"  ("showtime_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_user_created" ON "payments"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_customers" ADD CONSTRAINT "FK_8a1a136d64f734faad02af18886" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_b563a5aa5b8220de29579c464f3" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    // DDR-025: saved cards live on the Stripe Customer, so carrying the
    // Customer ids over keeps every user's cards. Token balances, packages
    // and the top-up ledger are dropped (ADR-018 supersedes ADR-017).
    await queryRunner.query(
      `INSERT INTO "payment_customers" ("user_id", "stripe_customer_id") SELECT "user_id", "stripe_customer_id" FROM "wallets" WHERE "stripe_customer_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_47316bd846ab99cd875b811b480"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_c57d19129968160f4db28fc8b28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_92558c08091598f7a4439586cda"`,
    );
    await queryRunner.query(`DROP TABLE "token_packages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_47316bd846ab99cd875b811b48"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c57d19129968160f4db28fc8b2"`,
    );
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."wallet_transactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."wallet_transactions_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "wallets"`);
  }

  // Lossy: restores the wallet tables as 1790240623162-AddWallets created
  // them, with every user's wallet at a zero balance and their Stripe
  // Customer id copied back. Balances, top-up history and token packages are
  // not restored — the reverted seed re-adds the packages.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "balance" bigint NOT NULL DEFAULT '0', "stripe_customer_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7c92ed85990976b66928742fc8d" UNIQUE ("stripe_customer_id"), CONSTRAINT "REL_92558c08091598f7a4439586cd" UNIQUE ("user_id"), CONSTRAINT "chk_wallets_balance_non_negative" CHECK ("balance" >= 0), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_transactions_type_enum" AS ENUM('top_up', 'payment', 'refund')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_transactions_status_enum" AS ENUM('pending', 'succeeded', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wallet_id" uuid NOT NULL, "type" "public"."wallet_transactions_type_enum" NOT NULL, "status" "public"."wallet_transactions_status_enum" NOT NULL DEFAULT 'pending', "tokens" integer NOT NULL, "amount_cents" integer, "currency" character varying(3), "token_package_id" uuid, "stripe_payment_intent_id" character varying, "failure_code" character varying, "failure_message" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_664b6434be7c2319098372c1a70" UNIQUE ("stripe_payment_intent_id"), CONSTRAINT "chk_wallet_transactions_amount_positive" CHECK ("amount_cents" IS NULL OR "amount_cents" > 0), CONSTRAINT "chk_wallet_transactions_tokens_positive" CHECK ("tokens" > 0), CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c57d19129968160f4db28fc8b2" ON "wallet_transactions"  ("wallet_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_47316bd846ab99cd875b811b48" ON "wallet_transactions"  ("token_package_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "token_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "tokens" integer NOT NULL, "price_cents" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'usd', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4e38a6689ff6fa8f61f11e4e011" UNIQUE ("code"), CONSTRAINT "chk_token_packages_price_positive" CHECK ("price_cents" > 0), CONSTRAINT "chk_token_packages_tokens_positive" CHECK ("tokens" > 0), CONSTRAINT "PK_b8803a0672e103c44dadf8f4d65" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_92558c08091598f7a4439586cda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_47316bd846ab99cd875b811b480" FOREIGN KEY ("token_package_id") REFERENCES "token_packages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "wallets" ("user_id", "stripe_customer_id") SELECT "u"."id", "pc"."stripe_customer_id" FROM "users" "u" LEFT JOIN "payment_customers" "pc" ON "pc"."user_id" = "u"."id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_b563a5aa5b8220de29579c464f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_customers" DROP CONSTRAINT "FK_8a1a136d64f734faad02af18886"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_payments_user_created"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b563a5aa5b8220de29579c464f"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TABLE "payment_customers"`);
  }
}
