import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/src/constants/brand";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brandPrimary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
          backgroundColor: "transparent",
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === "ios" ? 60 : 90}
            tint="light"
            style={StyleSheet.absoluteFill}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(248,250,252,0.85)", borderTopWidth: 1, borderTopColor: COLORS.border },
              ]}
            />
          </BlurView>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Orçamentos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" color={color} size={size} />
          ),
          tabBarButtonTestID: "tab-orcamentos",
        }}
      />
      <Tabs.Screen
        name="novo"
        options={{
          title: "Novo",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" color={color} size={size + 4} />
          ),
          tabBarButtonTestID: "tab-novo",
        }}
      />
      <Tabs.Screen
        name="definicoes"
        options={{
          title: "Definições",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
          tabBarButtonTestID: "tab-definicoes",
        }}
      />
    </Tabs>
  );
}
