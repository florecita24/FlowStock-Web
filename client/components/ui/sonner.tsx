import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-gray-900 !border-gray-700 !text-white !shadow-xl !rounded-xl",
          title:        "!text-white !font-semibold !text-sm",
          description:  "!text-gray-400 !text-xs !mt-0.5",
          actionButton: "!bg-primary !text-white",
          cancelButton: "!bg-gray-700 !text-gray-300",
          icon:         "!text-green-400",
          success:      "!text-white",
          error:        "!text-white",
          info:         "!text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
