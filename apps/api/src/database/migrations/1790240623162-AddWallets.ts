import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWallets1790240623162 implements MigrationInterface {
  name = 'AddWallets1790240623162';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    // DDR-024 / BR-39: every existing user gets a wallet, so no reader ever
    // has to handle "no wallet yet". New users get theirs at signup.
    await queryRunner.query(
      `INSERT INTO "wallets" ("user_id") SELECT "id" FROM "users"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
