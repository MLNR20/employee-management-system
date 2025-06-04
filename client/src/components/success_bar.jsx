const Success_Bar = ({ value }) => {
  return (
    <div
      className="bg-green-300 p-5 border-gray-200 border-solid rounded-lg mt-14"
      id="noRecordsContainer"
    >
      <h1 className="text-green-700">{value}</h1>
    </div>
  );
};

export default Success_Bar;
