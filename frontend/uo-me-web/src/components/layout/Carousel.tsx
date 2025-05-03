'use client';

import { useState } from "react";

interface DebtItem {
  name: string;
  amount: number;
  payment_id: number;
}

interface DebtCarouselProps {
  data: DebtItem[];
}

export default function Carousel({ data }: DebtCarouselProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activePayment, setActivePayment] = useState<any | null>(null);

  const toggleDetails = async (index: number) => {
    if (activeIndex === index) {
      setActiveIndex(null);
      setActivePayment(null);
    } else {
      const paymentId = data[index].payment_id;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch payment");
        const paymentData = await res.json();
        setActivePayment(paymentData);
        setActiveIndex(index);
      } catch (err) {
        console.error("Error fetching payment:", err);
        setActivePayment(null);
      }
    }
  };

  return (
    <div className="overflow-x-auto whitespace-nowrap py-4">
      <div className="inline-flex space-x-4 px-2">
        {data.map((item, index) => {
          const isActive = activeIndex === index;

          return (
            <div key={index} className="inline-block text-center w-64">
              <button
                onClick={() => toggleDetails(index)}
                className={`w-full h-32 p-4 border rounded shadow text-center transition-all duration-200
                  ${isActive ? 'bg-gray-200' : 'bg-white'} 
                  hover:shadow-md`}
              >
                <div className="font-bold text-lg">{item.name}</div>
                <span className="text-sm text-gray-500 block">still owes you...</span>
                <div className="text-red-500 font-semibold text-xl mt-1">{item.amount}€</div>
              </button>

              {isActive && activePayment && (
                <div className="mt-2 bg-gray-50 border rounded p-4 shadow w-full text-left">
                  <h3 className="text-lg font-semibold">{activePayment.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{activePayment.description}</p>

                  <div className="text-center text-xs text-gray-500 mb-4">
                    Due date: {new Date(activePayment.due_date).toLocaleDateString()}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                      PAY
                    </button>
                    <button
                      onClick={() => {
                        setActiveIndex(null);
                        setActivePayment(null);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}