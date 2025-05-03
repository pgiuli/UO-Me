interface ShareItem {
  name: string;
  description: string;
  amount: number;
}

interface SharesListProps {
  data: ShareItem[];
}

export default function SharesList({ data }: SharesListProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-3 py-2 px-4">
      {data.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-md w-full"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
              <img
                src="/placeholder-profile.png"
                alt="profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{item.description}</p>
              <p className="font-semibold text-gray-800">{item.name}</p>
            </div>
          </div>
          <div className="text-red-500 text-xl font-bold">{item.amount}€</div>
        </div>
      ))}
    </div>
  );
}