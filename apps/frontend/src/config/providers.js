export const providers = [
  {
    id: "google",
    name: "Google / Gmail",

    events: [
      {
        value: "email.received",
        label: "Correo recibido"
      }
    ],

    actions: [
      {
        value: "send_email",
        label: "Enviar correo"
      }
    ]
  },


  {
    id: "github",
    name: "GitHub",

    events: [
      {
        value: "issue.created",
        label: "Issue creado"
      },
      {
        value: "issue.closed",
        label: "Issue cerrado"
      },
      {
        value: "pull_request.created",
        label: "Pull Request creado"
      }
    ],

    actions: [
      {
        value: "create_issue",
        label: "Crear Issue"
      },
      {
        value: "comment_issue",
        label: "Comentar Issue"
      }
    ]
  },


  {
    id: "discord",
    name: "Discord",

    events: [
      {
        value: "message.created",
        label: "Mensaje creado"
      }
    ],

    actions: [
      {
        value: "send_message",
        label: "Enviar mensaje"
      }
    ]
  }
];