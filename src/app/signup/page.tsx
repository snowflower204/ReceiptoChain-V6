"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SignupType =
  | "CUSTOMER"
  | "BUSINESS_OWNER"
  | "BUSINESS_MEMBER";

interface SignupResponse {
  success?: boolean;
  message?: string;
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<SignupType>("CUSTOMER");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  // Business-owner fields
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [countryCode, setCountryCode] = useState("PH");
  const [defaultCurrency, setDefaultCurrency] =
    useState("PHP");
  const [timezone, setTimezone] =
    useState("Asia/Manila");

  // Business-member field
  const [invitationCode, setInvitationCode] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (!isStrongPassword(password)) {
      setIsError(true);
      setMessage(
        "Password must have 8 to 72 characters, including uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    const requestBody: Record<string, string> = {
      accountType,
      email,
      password,
    };

    if (accountType === "BUSINESS_OWNER") {
      requestBody.businessName = businessName;
      requestBody.legalName = legalName;
      requestBody.countryCode = countryCode;
      requestBody.defaultCurrency = defaultCurrency;
      requestBody.timezone = timezone;
    }

    if (accountType === "BUSINESS_MEMBER") {
      requestBody.invitationCode = invitationCode;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data =
        (await response.json()) as SignupResponse;

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create account."
        );
      }

      setIsError(false);
      setMessage(
        data.message || "Account created successfully."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error: unknown) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-yellow-950 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Create your ReceiptoChain account
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Securely manage and verify digital receipts.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-800">
              How will you use ReceiptoChain?
            </legend>

            <div className="grid gap-3 sm:grid-cols-3">
              <AccountTypeButton
                selected={accountType === "CUSTOMER"}
                title="Customer"
                description="Receive and view receipts"
                onClick={() =>
                  setAccountType("CUSTOMER")
                }
              />

              <AccountTypeButton
                selected={
                  accountType === "BUSINESS_OWNER"
                }
                title="Business Owner"
                description="Create a business workspace"
                onClick={() =>
                  setAccountType("BUSINESS_OWNER")
                }
              />

              <AccountTypeButton
                selected={
                  accountType === "BUSINESS_MEMBER"
                }
                title="Staff Member"
                description="Join using an invitation"
                onClick={() =>
                  setAccountType("BUSINESS_MEMBER")
                }
              />
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            />

            <p className="mt-1 text-xs text-slate-500">
              Include uppercase, lowercase, number, and
              special character.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Enter your password again"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
            />

            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) =>
                  setShowPassword(event.target.checked)
                }
              />

              Show passwords
            </label>
          </div>

          {accountType === "BUSINESS_OWNER" && (
            <section className="space-y-4 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <h2 className="font-semibold text-slate-900">
                Business information
              </h2>

              <div>
                <label
                  htmlFor="businessName"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Business name
                </label>

                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(event) =>
                    setBusinessName(event.target.value)
                  }
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Your public business name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label
                  htmlFor="legalName"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Legal name{" "}
                  <span className="font-normal text-slate-500">
                    (optional)
                  </span>
                </label>

                <input
                  id="legalName"
                  type="text"
                  value={legalName}
                  onChange={(event) =>
                    setLegalName(event.target.value)
                  }
                  placeholder="Registered legal business name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-yellow-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="countryCode"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Country code
                  </label>

                  <input
                    id="countryCode"
                    type="text"
                    value={countryCode}
                    onChange={(event) =>
                      setCountryCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    required
                    minLength={2}
                    maxLength={2}
                    placeholder="PH"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 uppercase text-slate-900 outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="defaultCurrency"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Currency
                  </label>

                  <input
                    id="defaultCurrency"
                    type="text"
                    value={defaultCurrency}
                    onChange={(event) =>
                      setDefaultCurrency(
                        event.target.value.toUpperCase()
                      )
                    }
                    required
                    minLength={3}
                    maxLength={3}
                    placeholder="PHP"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 uppercase text-slate-900 outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="timezone"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Timezone
                </label>

                <select
                  id="timezone"
                  value={timezone}
                  onChange={(event) =>
                    setTimezone(event.target.value)
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-yellow-500"
                >
                  <option value="Asia/Manila">
                    Philippines — Asia/Manila
                  </option>

                  <option value="Asia/Singapore">
                    Singapore — Asia/Singapore
                  </option>

                  <option value="Asia/Tokyo">
                    Japan — Asia/Tokyo
                  </option>

                  <option value="America/New_York">
                    United States — America/New_York
                  </option>

                  <option value="Europe/London">
                    United Kingdom — Europe/London
                  </option>
                </select>
              </div>
            </section>
          )}

          {accountType === "BUSINESS_MEMBER" && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <label
                htmlFor="invitationCode"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Business invitation code
              </label>

              <input
                id="invitationCode"
                type="text"
                value={invitationCode}
                onChange={(event) =>
                  setInvitationCode(
                    event.target.value.toUpperCase()
                  )
                }
                required
                placeholder="Enter the code from your business"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 uppercase text-slate-900 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-slate-600">
                Ask the business owner or administrator
                for an invitation code.
              </p>
            </section>
          )}

          {message && (
            <div
              role="alert"
              className={`rounded-lg px-4 py-3 text-sm ${
                isError
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-yellow-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

interface AccountTypeButtonProps {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}

function AccountTypeButton({
  selected,
  title,
  description,
  onClick,
}: AccountTypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200"
          : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <span className="block font-semibold text-slate-900">
        {title}
      </span>

      <span className="mt-1 block text-xs text-slate-600">
        {description}
      </span>
    </button>
  );
}