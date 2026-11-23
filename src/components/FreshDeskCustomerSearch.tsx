"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Customer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile_phone: string | null;
  created_at: string;
};

type FreshDeskCustomerSearchProps = {
  customers: Customer[];
};

export default function FreshDeskCustomerSearch({
  customers,
}: FreshDeskCustomerSearchProps) {
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      const fullName = `${customer.first_name ?? ""} ${
        customer.last_name ?? ""
      }`.toLowerCase();

      const email = (customer.email ?? "").toLowerCase();
      const mobilephone = (customer.mobile_phone ?? "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        mobilephone.includes(query)
      );
    });
  }, [customers, search]);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>

          <p className="mt-1 text-sm text-[#5A5553]">
            Search by name, email, or phone.
          </p>
        </div>

        <div className="w-full sm:max-w-sm">
          <label
            htmlFor="customer-search"
            className="sr-only"
          >
            Search customers
          </label>

          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-3 text-sm text-[#302C2A] outline-none transition focus:border-[#908A9B]"
          />
        </div>
      </div>

      {filteredCustomers.length > 0 ? (
        <div className="mt-4 space-y-3">
          {filteredCustomers.map((customer) => (
            <Link
              key={customer.id}
              href={`/fresh-desk/customers/${customer.id}`}
              className="block rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-semibold">
                {customer.first_name} {customer.last_name}
              </p>

              {customer.email && (
                <p className="mt-1 text-sm text-[#5A5553]">
                  {customer.email}
                </p>
              )}

              {customer.mobile_phone && (
                <p className="mt-1 text-sm text-[#5A5553]">
                  {customer.mobile_phone}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
          <p className="font-semibold">No customers found</p>

          <p className="mt-1 text-sm text-[#5A5553]">
            Try searching with a different name, email, or phone number.
          </p>
        </div>
      )}
    </div>
  );
}