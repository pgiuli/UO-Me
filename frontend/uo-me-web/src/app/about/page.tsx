// Project: UO-me
import React from "react";
import Navbar from "@/components/layout/Navbar";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 md:ml-56">
        <section className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">About UO-me</h1>

          <p className="text-gray-700 text-lg">
            <strong>UO-me</strong> is a simple and powerful web application designed to make
            <span className="font-semibold"> shared expense tracking </span> between friends easier and fairer.
          </p>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">🌟 What We Do</h2>
            <p className="text-gray-700">
              UO-me helps you keep track of who owes what after group events, dinners, trips, or daily expenses.
              Instead of awkward reminders or mental math, our platform automates the splitting and tracking of shared bills.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">🤝 How It Works</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Create a payment with a description and total amount.</li>
              <li>Add the friends who are involved and how much each owes.</li>
              <li>Everyone can view, accept, and fulfill their shares.</li>
              <li>Track fulfillment status and manage outstanding balances easily.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">🚀 Why Use UO-me?</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>No more forgotten debts or awkward reminders.</li>
              <li>Real-time overview of all payments and balances.</li>
              <li>Secure, user-friendly, and built with privacy in mind.</li>
              <li>Perfect for roommates, travel groups, couples, or friends.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">💡 Our Vision</h2>
            <p className="text-gray-700">
              We believe that splitting expenses should be effortless. UO-me is built to help you maintain trust,
              fairness, and peace of mind in your social circles — so you can focus on enjoying time together, not on who owes what.
            </p>
          </div>

          <p className="text-center text-gray-500 text-sm mt-10">
            Made with ❤️ by the UO-me team.
          </p>
        </section>
      </main>
    </>
  );
}