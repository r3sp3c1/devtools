import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { faker } from "@faker-js/faker";
import { useState } from "react";
import React from "react";

export default function Command() {
  const [refresh, setRefresh] = useState(0);

  const generateData = () => {
    return [
      { title: "Full Name", value: faker.person.fullName(), icon: Icon.Person },
      { title: "Email", value: faker.internet.email(), icon: Icon.Envelope },
      { title: "Phone", value: faker.phone.number(), icon: Icon.Phone },
      {
        title: "Street Address",
        value: faker.location.streetAddress(),
        icon: Icon.House,
      },
      { title: "City", value: faker.location.city(), icon: Icon.Building },
      { title: "Zip Code", value: faker.location.zipCode(), icon: Icon.Map },
      {
        title: "Credit Card",
        value: faker.finance.creditCardNumber(),
        icon: Icon.CreditCard,
      },
      { title: "IBAN", value: faker.finance.iban(), icon: Icon.BankNote },
      { title: "IP Address", value: faker.internet.ipv4(), icon: Icon.Globe },
      { title: "Company", value: faker.company.name(), icon: Icon.Building },
    ];
  };

  const [data, setData] = useState(generateData());

  const regenerate = () => {
    setData(generateData());
    setRefresh((r) => r + 1);
  };

  return (
    <List searchBarPlaceholder="Search fake data...">
      <List.Section title="Fake Identity & Data">
        {data.map((item, index) => (
          <List.Item
            key={`${index}-${refresh}`}
            icon={item.icon}
            title={item.title}
            subtitle={item.value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={item.value}
                />
                <Action
                  title="Regenerate All"
                  icon={Icon.ArrowClockwise}
                  onAction={regenerate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
